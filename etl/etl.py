#!/usr/bin/env python3
"""
Urban Mobility Data ETL script - Normalized 3-table schema.
Loads data into vendors, zones, and trips tables.
"""

import argparse
import os
import sys
import csv
from datetime import datetime
from math import isfinite, radians, sin, cos, sqrt, atan2

import pandas as pd
import numpy as np
import mysql.connector
from mysql.connector import errorcode

# Geographic bounds (NYC approx)
MIN_LAT, MAX_LAT = 40.4, 40.95
MIN_LON, MAX_LON = -74.35, -73.7

# Output log path
LOG_DIR = "data/logs"
os.makedirs(LOG_DIR, exist_ok=True)
CLEANING_LOG = os.path.join(LOG_DIR, "cleaning_log.csv")


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km using Haversine formula."""
    try:
        if pd.isna(lat1) or pd.isna(lon1) or pd.isna(lat2) or pd.isna(lon2):
            return None
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        R = 6371  # Earth's radius in km
        return R * c
    except Exception:
        return None


def is_valid_coordinate(lat, lon):
    try:
        if pd.isna(lat) or pd.isna(lon):
            return False
        lat = float(lat); lon = float(lon)
        return (MIN_LAT <= lat <= MAX_LAT) and (MIN_LON <= lon <= MAX_LON)
    except Exception:
        return False


def safe_div(a, b):
    try:
        if b is None:
            return None
        if pd.isna(a) or pd.isna(b):
            return None
        if float(b) == 0.0:
            return None
        return float(a) / float(b)
    except Exception:
        return None


def normalize_columns(df):
    df = df.rename(columns={c: c.strip() for c in df.columns})
    df.columns = [c.lower() for c in df.columns]
    return df


def detect_and_assign_columns(df):
    """Map common column variants to canonical names."""
    df = normalize_columns(df)

    # map pickup/dropoff datetime
    for c in ["tpep_pickup_datetime", "pickup_datetime", "pickup_time", "pickup_ts"]:
        if c in df.columns:
            df["pickup_datetime"] = pd.to_datetime(df[c], errors="coerce")
            break
    for c in ["tpep_dropoff_datetime", "dropoff_datetime", "dropoff_time", "dropoff_ts"]:
        if c in df.columns:
            df["dropoff_datetime"] = pd.to_datetime(df[c], errors="coerce")
            break

    # coords
    for c in ["pickup_longitude", "pickup_lon", "pickup_long"]:
        if c in df.columns:
            df["pickup_lon"] = pd.to_numeric(df[c], errors="coerce")
            break
    for c in ["pickup_latitude", "pickup_lat", "pickup_latitude_decimal"]:
        if c in df.columns:
            df["pickup_lat"] = pd.to_numeric(df[c], errors="coerce")
            break
    for c in ["dropoff_longitude", "dropoff_lon", "dropoff_long"]:
        if c in df.columns:
            df["dropoff_lon"] = pd.to_numeric(df[c], errors="coerce")
            break
    for c in ["dropoff_latitude", "dropoff_lat", "dropoff_latitude_decimal"]:
        if c in df.columns:
            df["dropoff_lat"] = pd.to_numeric(df[c], errors="coerce")
            break

    # distance (if available)
    for c in ["trip_distance", "distance", "tripdistance"]:
        if c in df.columns:
            df["trip_distance_km"] = pd.to_numeric(df[c], errors="coerce")
            break

    # fare (if available)
    for c in ["fare_amount", "fare", "fareamount"]:
        if c in df.columns:
            df["fare_amount"] = pd.to_numeric(df[c], errors="coerce")
            break

    # tip (if available)
    for c in ["tip_amount", "tip", "tipamount"]:
        if c in df.columns:
            df["tip_amount"] = pd.to_numeric(df[c], errors="coerce")
            break
    if "tip_amount" not in df.columns:
        df["tip_amount"] = 0.0

    # passenger count
    if "passenger_count" in df.columns:
        df["passenger_count"] = pd.to_numeric(df["passenger_count"], errors="coerce").fillna(1).astype(int)
    else:
        df["passenger_count"] = 1

    # vendor
    if "vendor_id" in df.columns:
        df["vendor_code"] = df["vendor_id"].astype(str)
    elif "vendor" in df.columns:
        df["vendor_code"] = df["vendor"].astype(str)
    else:
        df["vendor_code"] = None

    # trip_duration (if available)
    if "trip_duration" in df.columns and "trip_duration_seconds" not in df.columns:
        df["trip_duration_seconds"] = pd.to_numeric(df["trip_duration"], errors="coerce")

    # Convert trip_distance_km from miles to km if needed
    if "trip_distance_km" in df.columns:
        s = df["trip_distance_km"].dropna()
        if len(s) > 0 and s.mean() < 200 and s.median() < 30:
            df["trip_distance_km"] = df["trip_distance_km"] * 1.60934

    return df


def get_or_create_vendor(conn, vendor_code):
    """Get vendor_id from vendors table, create if doesn't exist."""
    if vendor_code is None:
        return None
    
    cur = conn.cursor()
    
    # Check if vendor exists
    cur.execute("SELECT vendor_id FROM vendors WHERE vendor_code = %s", (vendor_code,))
    result = cur.fetchone()
    
    if result:
        vendor_id = result[0]
    else:
        # Create new vendor
        cur.execute(
            "INSERT INTO vendors (vendor_code, vendor_name) VALUES (%s, %s)",
            (vendor_code, f"Vendor {vendor_code}")
        )
        conn.commit()
        vendor_id = cur.lastrowid
    
    cur.close()
    return vendor_id


def clean_chunk(df, conn):
    """Clean data and prepare for insertion into normalized schema."""
    df = detect_and_assign_columns(df)

    # compute duration if timestamps exist
    if "pickup_datetime" in df.columns and "dropoff_datetime" in df.columns:
        if "trip_duration_seconds" not in df.columns or df["trip_duration_seconds"].isna().all():
            df["trip_duration_seconds"] = (df["dropoff_datetime"] - df["pickup_datetime"]).dt.total_seconds()
    else:
        df["trip_duration_seconds"] = np.nan

    # Calculate distance using Haversine if not provided
    if "trip_distance_km" not in df.columns or df["trip_distance_km"].isna().all():
        df["trip_distance_km"] = df.apply(
            lambda r: haversine_distance(
                r.get("pickup_lat"), r.get("pickup_lon"),
                r.get("dropoff_lat"), r.get("dropoff_lon")
            ), axis=1
        )

    # Estimate fare if not provided
    if "fare_amount" not in df.columns or df["fare_amount"].isna().all():
        df["fare_amount"] = 2.50 + (df.get("trip_distance_km", 0) * 2.50) + ((df.get("trip_duration_seconds", 0) / 60) * 0.40)
        df["fare_amount"] = df["fare_amount"].clip(lower=2.50)

    # derived features
    def compute_speed(row):
        try:
            td = row["trip_duration_seconds"]
            dist = row["trip_distance_km"]
            if pd.isna(td) or td <= 0 or pd.isna(dist) or dist <= 0:
                return np.nan
            hours = td / 3600.0
            return dist / hours
        except Exception:
            return np.nan

    df["trip_speed_kmh"] = df.apply(compute_speed, axis=1)
    df["fare_per_km"] = df.apply(lambda r: safe_div(r.get("fare_amount", np.nan), r.get("trip_distance_km", np.nan)), axis=1)
    df["tip_pct"] = df.apply(lambda r: safe_div(r.get("tip_amount", 0.0), r.get("fare_amount", np.nan)), axis=1)
    df["hour_of_day"] = df["pickup_datetime"].dt.hour.where(df["pickup_datetime"].notnull(), None)
    df["day_of_week"] = df["pickup_datetime"].dt.day_name().where(df["pickup_datetime"].notnull(), None)

    # Get vendor_ids and cache them
    vendor_cache = {}
    
    # validate rows and split clean/excluded
    clean_rows = []
    excluded_rows = []

    for _, row in df.iterrows():
        reasons = []
        
        # timestamps
        if pd.isna(row.get("pickup_datetime")) or pd.isna(row.get("dropoff_datetime")):
            reasons.append("missing_timestamps")
        else:
            if row["dropoff_datetime"] < row["pickup_datetime"]:
                reasons.append("dropoff_before_pickup")

        # coords
        if not is_valid_coordinate(row.get("pickup_lat"), row.get("pickup_lon")):
            reasons.append("invalid_pickup_coord")
        if not is_valid_coordinate(row.get("dropoff_lat"), row.get("dropoff_lon")):
            reasons.append("invalid_dropoff_coord")

        # distance & duration
        if pd.isna(row.get("trip_distance_km")) or row.get("trip_distance_km") < 0:
            reasons.append("invalid_distance")
        if pd.isna(row.get("trip_duration_seconds")) or row.get("trip_duration_seconds") <= 0:
            reasons.append("invalid_duration")

        # fare
        if pd.isna(row.get("fare_amount")) or row.get("fare_amount") < 0:
            reasons.append("invalid_fare")

        # speed
        speed = row.get("trip_speed_kmh")
        if (speed is not None) and (pd.notna(speed)) and (isfinite(speed)) and (speed > 200):
            reasons.append("unrealistic_speed")

        if len(reasons) == 0:
            # Get or create vendor_id
            vendor_code = row.get("vendor_code")
            if vendor_code and vendor_code not in vendor_cache:
                vendor_cache[vendor_code] = get_or_create_vendor(conn, vendor_code)
            vendor_id = vendor_cache.get(vendor_code)
            
            # compose row for trips table
            trip_row = {
                "vendor_id": vendor_id,
                "pickup_datetime": row["pickup_datetime"].strftime("%Y-%m-%d %H:%M:%S") if pd.notna(row.get("pickup_datetime")) else None,
                "dropoff_datetime": row["dropoff_datetime"].strftime("%Y-%m-%d %H:%M:%S") if pd.notna(row.get("dropoff_datetime")) else None,
                "pickup_lat": row.get("pickup_lat") if pd.notna(row.get("pickup_lat")) else None,
                "pickup_lon": row.get("pickup_lon") if pd.notna(row.get("pickup_lon")) else None,
                "dropoff_lat": row.get("dropoff_lat") if pd.notna(row.get("dropoff_lat")) else None,
                "dropoff_lon": row.get("dropoff_lon") if pd.notna(row.get("dropoff_lon")) else None,
                "pickup_zone_id": None,  # To be populated later if zone matching is implemented
                "dropoff_zone_id": None,
                "passenger_count": int(row.get("passenger_count", 1)) if pd.notna(row.get("passenger_count")) else 1,
                "trip_distance_km": float(row.get("trip_distance_km")) if pd.notna(row.get("trip_distance_km")) else None,
                "trip_duration_seconds": float(row.get("trip_duration_seconds")) if pd.notna(row.get("trip_duration_seconds")) else None,
                "fare_amount": float(row.get("fare_amount")) if pd.notna(row.get("fare_amount")) else None,
                "tip_amount": float(row.get("tip_amount", 0.0)) if pd.notna(row.get("tip_amount", 0.0)) else 0.0,
                "trip_speed_kmh": float(row.get("trip_speed_kmh")) if pd.notna(row.get("trip_speed_kmh")) else None,
                "fare_per_km": float(row.get("fare_per_km")) if pd.notna(row.get("fare_per_km")) else None,
                "tip_pct": float(row.get("tip_pct")) if pd.notna(row.get("tip_pct")) else None,
                "hour_of_day": int(row.get("hour_of_day")) if pd.notna(row.get("hour_of_day")) else None,
                "day_of_week": row.get("day_of_week") if pd.notna(row.get("day_of_week")) else None,
            }
            clean_rows.append(trip_row)
        else:
            r = {"reasons": ";".join(reasons)}
            excluded_rows.append(r)

    return clean_rows, excluded_rows


def insert_trips_mysql(conn, table_name, rows, batch_size=1000):
    """Insert rows into trips table."""
    if not rows:
        return 0
    
    cols = [
        "vendor_id", "pickup_datetime", "dropoff_datetime",
        "pickup_lat", "pickup_lon", "dropoff_lat", "dropoff_lon",
        "pickup_zone_id", "dropoff_zone_id", "passenger_count",
        "trip_distance_km", "trip_duration_seconds", "fare_amount",
        "tip_amount", "trip_speed_kmh", "fare_per_km", "tip_pct",
        "hour_of_day", "day_of_week"
    ]
    
    placeholders = ", ".join(["%s"] * len(cols))
    collist = ", ".join([f"`{c}`" for c in cols])
    insert_sql = f"INSERT INTO `{table_name}` ({collist}) VALUES ({placeholders})"
    
    cur = conn.cursor()
    count = 0
    
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        vals = []
        for r in batch:
            vals.append(tuple(r.get(c) for c in cols))
        cur.executemany(insert_sql, vals)
        conn.commit()
        count += len(batch)
    
    cur.close()
    return count


def parse_args():
    p = argparse.ArgumentParser(description="ETL (clean + load) into MySQL for NYC Taxi dataset")
    p.add_argument("--input", required=True, help="Path to raw CSV (train.csv)")
    p.add_argument("--mysql-host", default="localhost")
    p.add_argument("--mysql-port", type=int, default=3306)
    p.add_argument("--mysql-user", required=True)
    p.add_argument("--mysql-password", required=True)
    p.add_argument("--mysql-db", required=True)
    p.add_argument("--table", default="trips")
    p.add_argument("--chunksize", type=int, default=200000)
    p.add_argument("--batch-size", type=int, default=1000)
    return p.parse_args()


def validate_input_file(input_path):
    """Check if input file exists and has content."""
    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)
    
    if os.path.getsize(input_path) == 0:
        print(f"ERROR: Input file is empty: {input_path}")
        sys.exit(1)
    
    print(f"✓ Input file validated: {input_path} ({os.path.getsize(input_path)} bytes)")


def main():
    args = parse_args()

    # Validate input file
    validate_input_file(args.input)

    # Connect to MySQL
    try:
        conn = mysql.connector.connect(
            host=args.mysql_host,
            port=args.mysql_port,
            user=args.mysql_user,
            password=args.mysql_password,
            database=args.mysql_db,
            autocommit=False,
            charset="utf8mb4"
        )
        print(f"✓ Connected to MySQL: {args.mysql_user}@{args.mysql_host}/{args.mysql_db}")
    except mysql.connector.Error as err:
        print("MySQL connection error:", err)
        sys.exit(1)

    total_in = 0
    total_clean = 0
    total_excluded = 0

    # Ensure log header
    if not os.path.exists(CLEANING_LOG):
        with open(CLEANING_LOG, "w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            writer.writerow(["chunk_index", "excluded_count", "sample_reason"])

    chunk_index = 0
    try:
        print("\n" + "="*60)
        print("STARTING ETL PROCESS")
        print("="*60 + "\n")
        
        for chunk in pd.read_csv(args.input, chunksize=args.chunksize, low_memory=False):
            chunk_index += 1
            total_in += len(chunk)
            print(f"[Chunk {chunk_index}] read {len(chunk)} rows")
            
            clean_rows, excluded_rows = clean_chunk(chunk, conn)
            inserted = insert_trips_mysql(conn, args.table, clean_rows, batch_size=args.batch_size)
            
            total_clean += inserted
            total_excluded += len(excluded_rows)

            # Log excluded rows
            with open(CLEANING_LOG, "a", newline="", encoding="utf-8") as fh:
                writer = csv.writer(fh)
                sample_reason = excluded_rows[0]["reasons"] if excluded_rows else ""
                writer.writerow([chunk_index, len(excluded_rows), sample_reason])

            print(f"[Chunk {chunk_index}] cleaned={len(clean_rows)} inserted={inserted} excluded={len(excluded_rows)}")
    
    except pd.errors.EmptyDataError:
        print(f"ERROR: CSV file has no valid data to parse: {args.input}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR during ETL: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

    print("\n" + "="*60)
    print("ETL COMPLETE")
    print("="*60)
    print(f"Total rows read:           {total_in:,}")
    print(f"Total cleaned & inserted:  {total_clean:,}")
    print(f"Total excluded:            {total_excluded:,}")
    print(f"Success rate:              {(total_clean/total_in*100):.1f}%")
    print(f"Cleaning log:              {CLEANING_LOG}")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()

