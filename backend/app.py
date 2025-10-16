import os
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Configure logging first
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL - fallback to SQLite for development
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///demo_data.db"
)

# Create engine with connection pooling
try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_size=10,
        max_overflow=20
    )
    # Test connection and check if trips table exists
    with engine.connect() as conn:
        conn.execute(text("SELECT COUNT(*) FROM trips LIMIT 1"))
    USE_MOCK_DATA = False
    logger.info("Database connection successful, using real data.")
except Exception as e:
    logger.warning(f"Database connection or trips table not found: {e}. Using mock data.")
    engine = None
    USE_MOCK_DATA = True

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Mock data for demo purposes
MOCK_TRIPS = [
    {
        'id': i,
        'pickup_datetime': f'2024-01-{(i % 28) + 1:02d} {(i % 24):02d}:00:00',
        'trip_duration_seconds': 600 + (i * 30) % 1800,
        'trip_distance_km': 2.5 + (i * 0.5) % 15,
        'trip_speed_kmh': 15 + (i * 2) % 40,
        'fare_amount': 8.50 + (i * 0.75) % 25,
        'passenger_count': 1 + (i % 4),
        'pickup_lat': 40.7589 + (i * 0.001) % 0.1,
        'pickup_lon': -73.9851 + (i * 0.001) % 0.1,
        'dropoff_lat': 40.7489 + (i * 0.001) % 0.1,
        'dropoff_lon': -73.9751 + (i * 0.001) % 0.1,
        'vendor_id': 1 + (i % 2),
        'tip_amount': 1.50 + (i * 0.25) % 5,
        'fare_per_km': 3.40 + (i * 0.1) % 2,
        'tip_pct': 15 + (i % 10),
        'hour_of_day': i % 24,
        'day_of_week': i % 7
    }
    for i in range(1, 1001)
]

def get_mock_summary():
    return {
        'total_trips': len(MOCK_TRIPS),
        'avg_distance_km': 8.75,
        'avg_fare': 16.25,
        'avg_tip': 2.75,
        'avg_speed_kmh': 25.5
    }

def get_mock_hotspots():
    return [
        {'zone_id': 1, 'zone_name': 'Times Square', 'trips': 150},
        {'zone_id': 2, 'zone_name': 'Central Park', 'trips': 120},
        {'zone_id': 3, 'zone_name': 'Brooklyn Bridge', 'trips': 95},
        {'zone_id': 4, 'zone_name': 'JFK Airport', 'trips': 85},
        {'zone_id': 5, 'zone_name': 'Wall Street', 'trips': 75}
    ]

def get_mock_insights():
    return {
        'rush_hour': {
            'explanation': 'Trips by hour',
            'data': [
                {'hour_of_day': h, 'trips': 20 + (h * 5) % 60}
                for h in range(24)
            ]
        },
        'spatial_hotspots': {
            'explanation': 'Morning vs Evening demand',
            'morning': [
                {'zone_name': 'Financial District', 'trips': 45},
                {'zone_name': 'Midtown East', 'trips': 38}
            ],
            'evening': [
                {'zone_name': 'Times Square', 'trips': 52},
                {'zone_name': 'Greenwich Village', 'trips': 41}
            ]
        }
    }

def get_mock_routes():
    return [
        {'pickup_zone_name': 'JFK Airport', 'dropoff_zone_name': 'Manhattan', 'trips': 85},
        {'pickup_zone_name': 'Times Square', 'dropoff_zone_name': 'Central Park', 'trips': 72},
        {'pickup_zone_name': 'Brooklyn', 'dropoff_zone_name': 'Manhattan', 'trips': 68}
    ]

def get_mock_fare_stats():
    return {
        'summary': {
            'avg_fare': 16.25,
            'stddev_fare': 8.50,
            'min_fare': 4.50,
            'max_fare': 85.00,
            'avg_fare_per_km': 4.25
        }
    }


# -------------------------
# Error Handlers
# -------------------------
@app.errorhandler(Exception)
def handle_exception(e):
    """Global error handler"""
    logger.error(f"Error: {str(e)}", exc_info=True)
    return jsonify({
        "error": str(e),
        "type": type(e).__name__
    }), 500


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


# -------------------------
# Utilities
# -------------------------
def parse_date_param(name):
    """Parse date from query parameters"""
    val = request.args.get(name)
    if not val:
        return None
    try:
        if len(val) == 10:
            return datetime.strptime(val, "%Y-%m-%d")
        return datetime.fromisoformat(val.replace('Z', '+00:00'))
    except Exception as e:
        logger.warning(f"Date parse error for {name}={val}: {e}")
        return None


def date_filter_clause(params, start, end):
    """Build date filter SQL clause"""
    clause = ""
    if start:
        clause += " AND pickup_datetime >= :start"
        params["start"] = start
    if end:
        clause += " AND pickup_datetime <= :end"
        params["end"] = end
    return clause


def safe_dict(row):
    """Convert SQLAlchemy row to dict"""
    if row is None:
        return {}
    try:
        return dict(row._mapping)
    except:
        return dict(row)


# -------------------------
# API Endpoints
# -------------------------

@app.route("/", methods=["GET"])
def root():
    """API root with available endpoints"""
    return jsonify({
        "status": "ok",
        "message": "NYC Taxi Analytics API",
        "version": "1.0",
        "endpoints": {
            "health": "/health",
            "summary": "/api/summary",
            "time_series": "/api/time-series?granularity=hour|day",
            "hotspots": "/api/hotspots?k=20",
            "fare_stats": "/api/fare-stats",
            "top_routes": "/api/top-routes?n=20",
            "trips": "/api/trips?page=1&limit=100",
            "insights": "/api/insights"
        }
    })


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    if USE_MOCK_DATA:
        return jsonify({
            "status": "healthy",
            "database": "mock_data",
            "trips_count": len(MOCK_TRIPS)
        })
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) as count FROM trips"))
            count = result.fetchone()[0]
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "trips_count": count
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 503


@app.route("/api/summary", methods=["GET"])
def summary():
    """Get aggregated summary statistics"""
    if USE_MOCK_DATA:
        return jsonify(get_mock_summary())
    
    try:
        start = parse_date_param("start")
        end = parse_date_param("end")
        params = {}
        clause = date_filter_clause(params, start, end)

        sql = text(f"""
            SELECT
                COUNT(*) AS total_trips,
                ROUND(COALESCE(AVG(trip_distance_km), 0), 3) AS avg_distance_km,
                ROUND(COALESCE(AVG(fare_amount), 0), 2) AS avg_fare,
                ROUND(COALESCE(AVG(tip_amount), 0), 2) AS avg_tip,
                ROUND(COALESCE(AVG(trip_speed_kmh), 0), 2) AS avg_speed_kmh
            FROM trips
            WHERE 1=1 {clause}
        """)
        
        with engine.connect() as conn:
            row = conn.execute(sql, params).fetchone()
            if row is None:
                return jsonify({"error": "No data found"}), 404
            return jsonify(safe_dict(row))
    
    except Exception as e:
        logger.error(f"Error in /api/summary: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/time-series", methods=["GET"])
def time_series():
    """Get time series data"""
    try:
        gran = request.args.get("granularity", "hour")
        start = parse_date_param("start")
        end = parse_date_param("end")
        params = {}
        clause = date_filter_clause(params, start, end)

        if gran == "day":
            period_expr = "DATE(pickup_datetime)"
        else:
            period_expr = "DATE_FORMAT(pickup_datetime, '%Y-%m-%d %H:00:00')"

        sql = text(f"""
            SELECT {period_expr} AS period, COUNT(*) AS trips
            FROM trips
            WHERE 1=1 {clause}
            GROUP BY period
            ORDER BY period
            LIMIT 10000
        """)
        
        with engine.connect() as conn:
            rows = [safe_dict(r) for r in conn.execute(sql, params).fetchall()]
            return jsonify(rows)
    
    except Exception as e:
        logger.error(f"Error in /api/time-series: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/hotspots", methods=["GET"])
def hotspots():
    """Get top pickup hotspots"""
    if USE_MOCK_DATA:
        return jsonify(get_mock_hotspots())
    
    try:
        k = min(int(request.args.get("k", 20)), 100)
        start = parse_date_param("start")
        end = parse_date_param("end")
        params = {}
        clause = date_filter_clause(params, start, end)

        sql = text(f"""
            SELECT 
                COALESCE(z.zone_id, 0) AS zone_id,
                COALESCE(z.zone_name, 'Unknown') AS zone_name,
                COUNT(t.id) AS trips
            FROM trips t
            LEFT JOIN zones z ON t.pickup_zone_id = z.zone_id
            WHERE 1=1 {clause}
            GROUP BY z.zone_id, z.zone_name
            HAVING trips > 0
            ORDER BY trips DESC
            LIMIT :k
        """)
        params["k"] = k
        
        with engine.connect() as conn:
            rows = [safe_dict(r) for r in conn.execute(sql, params).fetchall()]

        # Fallback to coordinates if no zones
        if not rows:
            params = {}
            clause = date_filter_clause(params, start, end)
            sql2 = text(f"""
                SELECT
                    ROUND(pickup_lat, 2) AS lat_grid,
                    ROUND(pickup_lon, 2) AS lon_grid,
                    COUNT(*) AS trips
                FROM trips
                WHERE 1=1 {clause}
                    AND pickup_lat IS NOT NULL
                    AND pickup_lon IS NOT NULL
                GROUP BY lat_grid, lon_grid
                ORDER BY trips DESC
                LIMIT :k
            """)
            params["k"] = k
            with engine.connect() as conn:
                rows = [safe_dict(r) for r in conn.execute(sql2, params).fetchall()]
        
        return jsonify(rows)
    
    except Exception as e:
        logger.error(f"Error in /api/hotspots: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/fare-stats", methods=["GET"])
def fare_stats():
    """Get fare statistics"""
    if USE_MOCK_DATA:
        return jsonify(get_mock_fare_stats())
    
    try:
        start = parse_date_param("start")
        end = parse_date_param("end")
        params = {}
        clause = date_filter_clause(params, start, end)

        sql = text(f"""
            SELECT
                ROUND(COALESCE(AVG(fare_amount), 0), 2) AS avg_fare,
                ROUND(COALESCE(STDDEV(fare_amount), 0), 2) AS stddev_fare,
                ROUND(COALESCE(MIN(fare_amount), 0), 2) AS min_fare,
                ROUND(COALESCE(MAX(fare_amount), 0), 2) AS max_fare,
                ROUND(COALESCE(AVG(fare_per_km), 0), 2) AS avg_fare_per_km
            FROM trips
            WHERE 1=1 {clause} AND fare_amount IS NOT NULL
        """)
        
        with engine.connect() as conn:
            summary = safe_dict(conn.execute(sql, params).fetchone())

        return jsonify({"summary": summary})
    
    except Exception as e:
        logger.error(f"Error in /api/fare-stats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/top-routes", methods=["GET"])
def top_routes():
    """Get top routes"""
    if USE_MOCK_DATA:
        return jsonify(get_mock_routes())
    
    try:
        n = min(int(request.args.get("n", 20)), 100)
        start = parse_date_param("start")
        end = parse_date_param("end")
        params = {}
        clause = date_filter_clause(params, start, end)

        sql = text(f"""
            SELECT
                t.pickup_zone_id,
                COALESCE(p.zone_name, 'Unknown') AS pickup_zone_name,
                t.dropoff_zone_id,
                COALESCE(d.zone_name, 'Unknown') AS dropoff_zone_name,
                COUNT(*) AS trips
            FROM trips t
            LEFT JOIN zones p ON t.pickup_zone_id = p.zone_id
            LEFT JOIN zones d ON t.dropoff_zone_id = d.zone_id
            WHERE 1=1 {clause}
            GROUP BY t.pickup_zone_id, t.dropoff_zone_id, p.zone_name, d.zone_name
            HAVING trips > 0
            ORDER BY trips DESC
            LIMIT :n
        """)
        params["n"] = n
        
        with engine.connect() as conn:
            rows = [safe_dict(r) for r in conn.execute(sql, params).fetchall()]
            return jsonify(rows)
    
    except Exception as e:
        logger.error(f"Error in /api/top-routes: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/trips", methods=["GET"])
def trips():
    """Get paginated trip details"""
    if USE_MOCK_DATA:
        page = max(int(request.args.get("page", 1)), 1)
        limit = min(int(request.args.get("limit", 100)), 1000)
        offset = (page - 1) * limit
        
        trips_subset = MOCK_TRIPS[offset:offset + limit]
        return jsonify({
            "page": page,
            "limit": limit,
            "total": len(MOCK_TRIPS),
            "rows": trips_subset
        })
    
    try:
        start = parse_date_param("start")
        end = parse_date_param("end")
        params = {}
        clause = date_filter_clause(params, start, end)

        # Filters
        if request.args.get("min_distance"):
            try:
                params["min_distance"] = float(request.args.get("min_distance"))
                clause += " AND trip_distance_km >= :min_distance"
            except ValueError:
                pass
        
        if request.args.get("max_distance"):
            try:
                params["max_distance"] = float(request.args.get("max_distance"))
                clause += " AND trip_distance_km <= :max_distance"
            except ValueError:
                pass

        page = max(int(request.args.get("page", 1)), 1)
        limit = min(int(request.args.get("limit", 100)), 1000)
        offset = (page - 1) * limit

        sql = text(f"""
            SELECT 
                id, vendor_id, pickup_datetime, dropoff_datetime,
                pickup_lat, pickup_lon, dropoff_lat, dropoff_lon,
                passenger_count, trip_distance_km, trip_duration_seconds,
                fare_amount, tip_amount, trip_speed_kmh, fare_per_km, 
                tip_pct, hour_of_day, day_of_week
            FROM trips
            WHERE 1=1 {clause}
            ORDER BY pickup_datetime DESC
            LIMIT :limit OFFSET :offset
        """)
        params["limit"] = limit
        params["offset"] = offset

        with engine.connect() as conn:
            rows = [safe_dict(r) for r in conn.execute(sql, params).fetchall()]
            
            try:
                count_sql = text(f"SELECT COUNT(*) AS total FROM trips WHERE 1=1 {clause}")
                total = conn.execute(count_sql, params).fetchone()[0]
            except:
                total = -1

        return jsonify({"page": page, "limit": limit, "total": total, "rows": rows})
    
    except Exception as e:
        logger.error(f"Error in /api/trips: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/insights", methods=["GET"])
def insights():
    """Get data insights"""
    if USE_MOCK_DATA:
        return jsonify(get_mock_insights())
    
    try:
        start = parse_date_param("start")
        end = parse_date_param("end")
        params = {}
        clause = date_filter_clause(params, start, end)

        with engine.connect() as conn:
            # Rush hour analysis
            sql1 = text(f"""
                SELECT COALESCE(hour_of_day, 0) AS hour_of_day, COUNT(*) AS trips
                FROM trips
                WHERE 1=1 {clause} AND hour_of_day IS NOT NULL
                GROUP BY hour_of_day
                ORDER BY hour_of_day
            """)
            rush_rows = [safe_dict(r) for r in conn.execute(sql1, params).fetchall()]

            # Morning hotspots
            sql2 = text(f"""
                SELECT t.pickup_zone_id, COALESCE(z.zone_name, 'Unknown') AS zone_name, COUNT(*) AS trips
                FROM trips t
                LEFT JOIN zones z ON t.pickup_zone_id = z.zone_id
                WHERE 1=1 {clause} AND hour_of_day BETWEEN 7 AND 9
                GROUP BY t.pickup_zone_id, z.zone_name
                HAVING trips > 0
                ORDER BY trips DESC
                LIMIT 10
            """)
            morning = [safe_dict(r) for r in conn.execute(sql2, params).fetchall()]

            # Evening hotspots
            sql3 = text(f"""
                SELECT t.pickup_zone_id, COALESCE(z.zone_name, 'Unknown') AS zone_name, COUNT(*) AS trips
                FROM trips t
                LEFT JOIN zones z ON t.pickup_zone_id = z.zone_id
                WHERE 1=1 {clause} AND hour_of_day BETWEEN 17 AND 19
                GROUP BY t.pickup_zone_id, z.zone_name
                HAVING trips > 0
                ORDER BY trips DESC
                LIMIT 10
            """)
            evening = [safe_dict(r) for r in conn.execute(sql3, params).fetchall()]

        return jsonify({
            "rush_hour": {"explanation": "Trips by hour", "data": rush_rows},
            "spatial_hotspots": {
                "explanation": "Morning vs Evening demand",
                "morning": morning,
                "evening": evening
            }
        })
    
    except Exception as e:
        logger.error(f"Error in /api/insights: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    debug = os.getenv("FLASK_DEBUG", "false").lower() in ("1", "true")
    
    logger.info(f"Starting Flask app on port {port}")
    logger.info(f"Database URL: {DATABASE_URL}")
    
    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug
    )
    