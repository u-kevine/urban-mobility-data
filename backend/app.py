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

# Database URL - updated to match your docker-compose
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://my_user:my_password@localhost:3306/my_database"
)

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20
)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Configure logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
    port = int(os.getenv("PORT", 3000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() in ("1", "true")
    
    logger.info(f"Starting Flask app on port {port}")
    logger.info(f"Database URL: {DATABASE_URL}")
    
    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug
    )
    