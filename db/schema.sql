-- NYC Taxi Project - 3-table normalized schema (MySQL 8+)
-- Created: 2025-10-13

-- Drop existing tables (careful in production)
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS zones;
DROP TABLE IF EXISTS vendors;

-- Vendors table: taxi companies or data vendors
CREATE TABLE vendors (
    vendor_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_code VARCHAR(50) UNIQUE,
    vendor_name VARCHAR(255),
    notes TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Zones table: mapping to neighborhoods / geocoded cells / taxi zones
CREATE TABLE zones (
    zone_id INT AUTO_INCREMENT PRIMARY KEY,
    zone_name VARCHAR(255),
    borough VARCHAR(255),
    centroid_lat DOUBLE,
    centroid_lon DOUBLE,
    shapefile_id VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trips table: main facts table, normalized to reference vendors and zones
CREATE TABLE trips (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT,
    pickup_datetime DATETIME NOT NULL,
    dropoff_datetime DATETIME NOT NULL,
    pickup_lat DOUBLE,
    pickup_lon DOUBLE,
    dropoff_lat DOUBLE,
    dropoff_lon DOUBLE,
    pickup_zone_id INT,
    dropoff_zone_id INT,
    passenger_count INT CHECK (passenger_count >= 0),
    trip_distance_km DOUBLE CHECK (trip_distance_km >= 0),
    trip_duration_seconds DOUBLE CHECK (trip_duration_seconds >= 0),
    fare_amount DOUBLE CHECK (fare_amount >= 0),
    tip_amount DOUBLE DEFAULT 0 CHECK (tip_amount >= 0),
    trip_speed_kmh DOUBLE,
    fare_per_km DOUBLE,
    tip_pct DOUBLE,
    hour_of_day TINYINT CHECK (hour_of_day BETWEEN 0 AND 23),
    day_of_week VARCHAR(16),
    CONSTRAINT fk_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pickup_zone FOREIGN KEY (pickup_zone_id) REFERENCES zones(zone_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dropoff_zone FOREIGN KEY (dropoff_zone_id) REFERENCES zones(zone_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for common queries
CREATE INDEX idx_trips_pickup_datetime ON trips (pickup_datetime);
CREATE INDEX idx_trips_pickup_zone ON trips (pickup_zone_id);
CREATE INDEX idx_trips_dropoff_zone ON trips (dropoff_zone_id);
CREATE INDEX idx_trips_vendor ON trips (vendor_id);
CREATE INDEX idx_trips_fare ON trips (fare_amount);
CREATE INDEX idx_trips_speed ON trips (trip_speed_kmh);

-- Optional summary view (for analytics)
CREATE OR REPLACE VIEW trip_summary AS
SELECT
    DATE(pickup_datetime) AS trip_date,
    COUNT(*) AS total_trips,
    ROUND(AVG(trip_distance_km), 2) AS avg_distance_km,
    ROUND(AVG(fare_amount), 2) AS avg_fare,
    ROUND(AVG(trip_duration_seconds) / 60, 1) AS avg_duration_min,
    ROUND(AVG(tip_pct), 2) AS avg_tip_pct
FROM trips
GROUP BY DATE(pickup_datetime)
ORDER BY trip_date DESC;


