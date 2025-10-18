# Urban Mobility Data Explorer

A comprehensive full-stack application for analyzing New York City taxi trip patterns using real-world datasets. This project demonstrates enterprise-level data processing, database design, and interactive visualization capabilities for urban mobility insights.

## Team 17
- Kevine Uwisanga
- Tito Jean Sibo
- Nkhomotabo Amazing Mkhonta

## Project Overview

This application processes raw NYC taxi trip data to provide meaningful insights into urban transportation patterns. The system includes data cleaning pipelines, a normalized relational database, a REST API backend, and an interactive web dashboard for data exploration and analysis.

## Key Features

- **Data Processing Pipeline**: Automated cleaning and enrichment of raw taxi trip records
- **Interactive Dashboard**: Real-time analytics with dynamic filtering and visualizations
- **Geographic Analysis**: Pickup hotspots and route pattern identification
- **Statistical Insights**: Trip duration, distance, fare, and speed analysis
- **Modern Interface**: Responsive design with dark and light theme support
- **Advanced Filtering**: Filter data by date ranges, distance, fare amounts, and more
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Normalized Schema**: 3-table design (vendors, zones, trips) for optimal data organization

## System Requirements

- **Python**: 3.8 or higher
- **Docker & Docker Compose**: Latest versions (Recommended)
- **OR MySQL**: 8.0 or higher (for non-Docker setup)
- **RAM**: At least 4GB for data processing
- **Storage**: 2GB free space for database and data files
- **Browser**: Modern web browser (Chrome, Firefox, Safari, Edge)
- **Operating System**: Linux, macOS, or Windows with WSL

## Quick Start with Docker (Recommended)

### Prerequisites

1. **Install Docker and Docker Compose**:
   - Download from: https://www.docker.com/get-started
   - Verify installation:
     ```bash
     docker --version
     docker-compose --version
     ```

### Step 1: Clone the Repository

```bash
git clone https://github.com/u-kevine/urban-mobility-data.git
cd urban-mobility-data
```

### Step 2: Start MySQL Database with Docker Compose

```bash
# Start MySQL service only
docker-compose up -d mysql
```

This command will:
- Pull the MySQL 8.0 image
- Create and start the MySQL container on port 3306
- Set up the database with credentials from docker-compose.yml

**Verify MySQL is running**:
```bash
docker-compose ps
```

Expected output:
```
NAME                COMMAND                  SERVICE             STATUS              PORTS
mysql_db            "docker-entrypoint.s…"   mysql               Up                  0.0.0.0:3306->3306/tcp
```

### Step 3: Initialize Database Schema

```bash
# Create the database schema
docker exec -i mysql_db mysql -u my_user -pmy_password my_database < db/schema.sql
```

**Verify tables were created**:
```bash
docker exec -it mysql_db mysql -u my_user -pmy_password my_database -e "SHOW TABLES;"
```

Expected output:
```
+----------------------+
| Tables_in_my_database|
+----------------------+
| trips                |
| vendors              |
| zones                |
+----------------------+
```

### Step 4: Prepare Data

Ensure your training data is in place:

```bash
# Check if data file exists
ls -lh data/raw/train.csv

# If using Git LFS, pull the file
git lfs pull
```

### Step 5: Install Python Dependencies

```bash
# Create virtual environment (recommended)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Linux/macOS
# OR
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt
```

### Step 6: Run ETL Process (Load Data)

```bash
# Run ETL script to load data into MySQL
python3 etl.py \
  --input data/raw/train.csv \
  --mysql-user my_user \
  --mysql-password my_password \
  --mysql-db my_database \
  --mysql-host localhost \
  --mysql-port 3306 \
  --table trips \
  --chunksize 50000 \
  --batch-size 1000
```

**Monitor Progress**:
The ETL script will display real-time progress:
```
============================================================
STARTING ETL PROCESS
============================================================

✓ Connected to MySQL: my_user@localhost/my_database

[Chunk 1] read 50000 rows
[Chunk 1] cleaned=48523 inserted=48523 excluded=1477
[Chunk 2] read 50000 rows
[Chunk 2] cleaned=49102 inserted=49102 excluded=898
...

============================================================
ETL COMPLETE
============================================================
Total rows read:           1,000,000
Total cleaned & inserted:    958,345
Total excluded:               41,655
Success rate:                 95.8%
Cleaning log:              data/logs/cleaning_log.csv
============================================================
```

### Step 7: Start Application Services

**Option A: Using convenience scripts (Recommended)**
```bash
# Start both backend and frontend
./start_all.sh

# This will:
# - Start the backend API on port 3000
# - Start the frontend server on port 8080
# - Display access URLs and service status
```

**Option B: Manual startup**
```bash
# Terminal 1: Start backend
cd backend
python3 app.py

# Terminal 2: Start frontend (in a new terminal)
cd frontend
python3 -m http.server 8080
```

### Step 8: Access the Application

Once services are running:

- **Frontend Dashboard**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health

### Step 9: Verify Everything is Working

```bash
# Check status of all services
./demo.sh
```

This script will verify:
- Backend server status
- Frontend server status
- Database connection
- Data loaded in database

### Step 10: Stop Services

```bash
# Stop all services
./stop_all.sh

# This will gracefully stop:
# - Backend API server
# - Frontend web server
# - Clean up PID files
```

**To stop Docker services:**
```bash
# Stop MySQL container
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

## Complete Manual Setup Guide (Without Docker)

### Step 1: Clone the Repository

```bash
git clone https://github.com/u-kevine/urban-mobility-data.git
cd urban-mobility-data
```

### Step 2: Install Python Dependencies

Create a virtual environment (recommended):

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

Install all required packages:

```bash
pip install -r requirements.txt
```

Verify installation:

```bash
pip list
```

### Step 3: Set Up MySQL Database

#### Install MySQL Server (if not already installed):

```bash
# On Ubuntu/Debian:
sudo apt update
sudo apt install mysql-server

# On macOS (using Homebrew):
brew install mysql

# On Windows:
# Download and install from https://dev.mysql.com/downloads/installer/
```

#### Start MySQL Service:

```bash
# On Linux:
sudo systemctl start mysql
sudo systemctl enable mysql

# On macOS:
brew services start mysql

# On Windows:
# MySQL runs as a Windows service automatically
```

#### Create Database and User:

```bash
# Login to MySQL as root
mysql -u root -p
```

Run these SQL commands:

```sql
-- Create database
CREATE DATABASE my_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user and grant privileges
CREATE USER 'my_user'@'localhost' IDENTIFIED BY 'my_password';
GRANT ALL PRIVILEGES ON my_database.* TO 'my_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### Step 4: Initialize Database Schema

```bash
# Run the schema creation script
mysql -u my_user -pmy_password my_database < db/schema.sql
```

**Verify tables were created**:

```bash
mysql -u my_user -pmy_password my_database -e "SHOW TABLES;"
```

### Step 5: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cat > .env << EOF
DATABASE_URL=mysql+pymysql://my_user:my_password@localhost:3306/my_database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=my_user
MYSQL_PASSWORD=my_password
MYSQL_DB=my_database
FLASK_APP=app.py
FLASK_ENV=development
PORT=3000
EOF
```

### Step 6: Run ETL Process

```bash
python3 etl.py \
  --input data/raw/train.csv \
  --mysql-user my_user \
  --mysql-password my_password \
  --mysql-db my_database \
  --mysql-host localhost \
  --mysql-port 3306 \
  --table trips \
  --chunksize 50000 \
  --batch-size 1000
```

### Step 7: Start the Backend API

```bash
# Method 1: Using convenience script (Development mode)
./start_dev.sh

# Method 2: Using convenience script (Production mode with Gunicorn)
./start_server.sh

# Method 3: Using Flask directly
cd backend
python3 app.py

# Method 4: Using Gunicorn (Production)
cd backend
gunicorn -w 4 -b 0.0.0.0:3000 app:app

# The API will be available at http://localhost:3000
```

**Test the API**:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "trips_count": 958345
}
```

### Step 8: Start the Frontend

Open a new terminal:

```bash
cd frontend

# Start simple HTTP server
python3 -m http.server 8080
```

### Step 9: Access the Dashboard

Open your browser and navigate to: http://localhost:8080

## Docker Compose Configuration

The project uses Docker Compose for easy deployment. Here's the complete configuration:

### docker-compose.yml

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: mysql_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: my_database
      MYSQL_USER: my_user
      MYSQL_PASSWORD: my_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

volumes:
  mysql_data:
```

### Service Description

**mysql**:
- Uses official MySQL 8.0 image
- Persists data using named volume `mysql_data`
- Uses native password authentication
- Health check ensures database is ready before dependent services start
- Exposes port 3306 for host access

**Note**: The backend and frontend services are run locally (not containerized) to allow for easier development and debugging.

## Using the Dashboard

### Dashboard Features

1. **Status Banner**:
   - Green indicator: Backend connected and database accessible
   - Red indicator: Connection issues
   - Shows total trips count

2. **Summary Statistics Cards**:
   - **Total Trips**: Total number of taxi trips in database
   - **Avg Distance**: Average trip distance in kilometers
   - **Avg Fare**: Average fare amount in dollars
   - **Avg Speed**: Average trip speed in km/h

3. **Interactive Charts**:
   - **Trips by Hour**: Bar chart showing trip distribution across 24 hours
   - **Distance Distribution**: Histogram of trip distances
   - **Speed Distribution**: Histogram of trip speeds
   - **Top Pickup Zones**: Most popular pickup locations
   - **Top Routes**: Most frequent pickup-to-dropoff combinations

4. **Filters Section**:
   - **Date From/To**: Filter trips by date range
   - **Min/Max Distance**: Filter by trip distance in kilometers
   - **Apply Filters**: Updates all visualizations with filtered data
   - **Reset**: Clears all filters and shows all data

5. **Recent Trips Table**:
   - Displays detailed information for individual trips
   - Columns: ID, Pickup Time, Duration, Distance, Speed, Fare, Passengers
   - Pagination: 50 trips per page
   - Navigation: Previous/Next buttons

6. **Key Insights Section**:
   - Rush hour analysis
   - Morning vs evening pickup patterns
   - Spatial demand patterns

7. **Theme Toggle**:
   - Switch between Light and Dark modes
   - Persists preference in browser

### Example Usage Workflow

#### Scenario 1: Analyzing Morning Rush Hour

1. Click on filters section
2. Leave date range empty (all dates)
3. Set Min Distance: 2 (to focus on non-trivial trips)
4. Click "Apply Filters"
5. Observe "Trips by Hour" chart - peak at 7-9 AM
6. Check "Top Pickup Zones" for morning hotspots
7. Review "Key Insights" for morning patterns

#### Scenario 2: Weekend Long-Distance Trips

1. Set Date From: Select a Saturday
2. Set Date To: Select the following Sunday
3. Set Min Distance: 20 (long trips)
4. Click "Apply Filters"
5. Observe lower trip counts but higher distances
6. Check "Top Routes" for popular long-distance routes

#### Scenario 3: Fare Analysis

1. Open browser developer tools (F12)
2. Go to Console tab
3. Execute custom API call:
   ```javascript
   fetch(`${window.API_BASE}/api/fare-stats`)
     .then(r => r.json())
     .then(data => console.log(data));
   ```
4. View detailed fare statistics

## API Endpoints Reference

### Base URL
```
http://localhost:3000
```

### Available Endpoints

#### 1. GET /health
Check API and database status

**Example**:
```bash
curl http://localhost:3000/health
```

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "trips_count": 958345
}
```

#### 2. GET /api/summary
Get aggregate statistics

**Query Parameters**:
- `start` (optional): Start date (YYYY-MM-DD)
- `end` (optional): End date (YYYY-MM-DD)

**Example**:
```bash
curl "http://localhost:3000/api/summary?start=2024-01-01&end=2024-01-31"
```

**Response**:
```json
{
  "total_trips": 85234,
  "avg_distance_km": 5.67,
  "avg_fare": 15.43,
  "avg_tip": 2.31,
  "avg_speed_kmh": 18.92
}
```

#### 3. GET /api/trips
Get paginated trip records

**Query Parameters**:
- `page` (default: 1): Page number
- `limit` (default: 100, max: 1000): Records per page
- `start` (optional): Start date
- `end` (optional): End date
- `min_distance` (optional): Minimum distance
- `max_distance` (optional): Maximum distance

**Example**:
```bash
curl "http://localhost:3000/api/trips?page=1&limit=50&min_distance=5"
```

**Response**:
```json
{
  "page": 1,
  "limit": 50,
  "total": 458234,
  "rows": [
    {
      "id": 12345,
      "pickup_datetime": "2024-01-15 08:30:00",
      "trip_distance_km": 8.5,
      "fare_amount": 22.50,
      ...
    }
  ]
}
```

#### 4. GET /api/hotspots
Get top pickup locations

**Query Parameters**:
- `k` (default: 20, max: 100): Number of results

**Example**:
```bash
curl "http://localhost:3000/api/hotspots?k=10"
```

**Response**:
```json
[
  {
    "zone_id": 237,
    "zone_name": "Upper East Side South",
    "trips": 45678
  }
]
```

#### 5. GET /api/top-routes
Get most popular routes

**Query Parameters**:
- `n` (default: 20, max: 100): Number of results

**Example**:
```bash
curl "http://localhost:3000/api/top-routes?n=5"
```

**Response**:
```json
[
  {
    "pickup_zone_id": 237,
    "pickup_zone_name": "Upper East Side South",
    "dropoff_zone_id": 161,
    "dropoff_zone_name": "Midtown Center",
    "trips": 12543
  }
]
```

#### 6. GET /api/insights
Get data insights and patterns

**Example**:
```bash
curl http://localhost:3000/api/insights
```

**Response**:
```json
{
  "rush_hour": {
    "explanation": "Trips by hour",
    "data": [...]
  },
  "spatial_hotspots": {
    "explanation": "Morning vs Evening demand",
    "morning": [...],
    "evening": [...]
  }
}
```

#### 7. GET /api/fare-stats
Get fare statistics

**Example**:
```bash
curl http://localhost:3000/api/fare-stats
```

**Response**:
```json
{
  "summary": {
    "avg_fare": 15.43,
    "stddev_fare": 12.56,
    "min_fare": 2.50,
    "max_fare": 450.00,
    "avg_fare_per_km": 2.72
  }
}
```

## Troubleshooting

### Docker Issues

#### Problem: "Cannot connect to Docker daemon"

**Solution**:
```bash
# Start Docker service
sudo systemctl start docker

# Or on macOS
open -a Docker

# Check Docker is running
docker ps
```

#### Problem: "Port already in use"

**Solution**:
```bash
# Find what's using the port
sudo lsof -i :3306
sudo lsof -i :3000
sudo lsof -i :8080

# Kill the process or change port in docker-compose.yml
# Then restart
docker-compose down
docker-compose up -d
```

#### Problem: "mysql_db container keeps restarting"

**Solution**:
```bash
# Check logs
docker-compose logs mysql

# Common causes:
# 1. Corrupted volume - remove and recreate
docker-compose down -v
docker volume rm urban-mobility-data_mysql_data
docker-compose up -d mysql

# 2. Permission issues - check volume permissions
docker exec -it mysql_db ls -la /var/lib/mysql
```

### Database Connection Issues

#### Problem: "Can't connect to MySQL server"

**Solutions**:
```bash
# For Docker setup
# Check container is running
docker-compose ps

# Test connection from host
docker exec -it mysql_db mysql -u my_user -pmy_password -e "SELECT 1;"

# For local MySQL
# Check service status
sudo systemctl status mysql

# Test connection
mysql -u my_user -pmy_password my_database -e "SELECT 1;"
```

#### Problem: "Access denied for user"

**Solutions**:
```bash
# Verify credentials in docker-compose.yml match .env and ETL command
# Reset user password
docker exec -it mysql_db mysql -u root -prootpassword

# Then in MySQL:
ALTER USER 'my_user'@'%' IDENTIFIED BY 'my_password';
FLUSH PRIVILEGES;
EXIT;
```

### ETL Script Errors

#### Problem: "Permission denied" or "File not found"

**Solutions**:
```bash
# Check file exists
ls -l data/raw/train.csv

# Check file permissions
chmod 644 data/raw/train.csv

# For Git LFS files
git lfs pull
```

#### Problem: "Out of memory" during ETL

**Solutions**:
```bash
# Reduce chunksize parameter
python3 etl.py --input data/raw/train.csv \
  --chunksize 10000 \  # Reduced from 50000
  --batch-size 500 \   # Reduced from 1000
  --mysql-user my_user \
  --mysql-password my_password \
  --mysql-db my_database

# Monitor memory usage
htop
```

#### Problem: "MySQL server has gone away"

**Solutions**:
```bash
# Increase MySQL timeout in docker-compose.yml
# Add under mysql service command:
command: >
  --default-authentication-plugin=mysql_native_password
  --max_allowed_packet=256M
  --wait_timeout=28800

# Restart services
docker-compose restart mysql
```

### API Server Issues

#### Problem: "ModuleNotFoundError"

**Solutions**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

#### Problem: "500 Internal Server Error"

**Solutions**:
```bash
# Check logs
tail -f logs/backend.log

# Enable debug mode
export FLASK_DEBUG=1
cd backend
python3 app.py
```

### Frontend Issues

#### Problem: Dashboard shows "Cannot connect to backend"

**Solutions**:
1. Verify backend is running:
   ```bash
   curl http://localhost:3000/health
   ```

2. Check browser console (F12) for CORS errors

3. Verify API_BASE in main.js matches your backend URL

4. Clear browser cache (Ctrl+Shift+Delete)

#### Problem: Charts not displaying

**Solutions**:
1. Open browser console (F12) and check for JavaScript errors

2. Verify Chart.js is loading:
   ```javascript
   // In browser console
   typeof Chart
   // Should return "function"
   ```

3. Check Network tab for failed API requests

4. Verify data is returned from API endpoints

## Production Deployment

### Security Considerations

1. **Change default passwords** in docker-compose.yml and .env
2. **Use environment variables** for sensitive data
3. **Enable SSL/TLS** for production deployments
4. **Configure firewall** to restrict database access
5. **Regular backups** of database

### Database Backup and Maintenance

```bash
# Backup database
docker exec mysql_db mysqldump -u my_user -pmy_password my_database > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i mysql_db mysql -u my_user -pmy_password my_database < backup_20240115.sql

# Optimize tables
docker exec -it mysql_db mysql -u my_user -pmy_password my_database -e "OPTIMIZE TABLE trips;"
```

### Monitoring and Logging

```bash
# View all logs
tail -f logs/backend.log
tail -f logs/frontend.log

# View Docker logs
docker-compose logs -f mysql

# Monitor resource usage
docker stats

# Check service status
./demo.sh
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for better query performance (already in schema.sql)
CREATE INDEX idx_pickup_datetime ON trips(pickup_datetime);
CREATE INDEX idx_dropoff_datetime ON trips(dropoff_datetime);
CREATE INDEX idx_distance ON trips(trip_distance_km);
CREATE INDEX idx_fare ON trips(fare_amount);
CREATE INDEX idx_speed ON trips(trip_speed_kmh);
CREATE INDEX idx_hour ON trips(hour_of_day);
CREATE INDEX idx_day ON trips(day_of_week);

-- Analyze tables for query optimization
ANALYZE TABLE trips;
ANALYZE TABLE zones;
ANALYZE TABLE vendors;

-- Check index usage
SHOW INDEX FROM trips;
```

### Application Optimization

The application already includes several optimizations:

1. **Connection pooling** in app.py:
```python
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20
)
```

2. **Chunked data processing** in ETL script
3. **Batch inserts** for database operations
4. **Indexed queries** for common operations

## Project Structure

```
urban-mobility-data/
├── docker-compose.yml          # Docker orchestration
├── .env                        # Environment variables (not in git)
├── .env.example                # Environment template
├── requirements.txt            # Python dependencies
├── etl.py                      # Data processing script
├── config.py                   # Configuration management
├── README.md                   # This file
├── start_all.sh                # Start all services
├── start_dev.sh                # Start in development mode
├── start_server.sh             # Start in production mode
├── stop_all.sh                 # Stop all services
├── demo.sh                     # Check system status
├── data/
│   ├── raw/
│   │   └── train.csv           # Raw taxi trip data (Git LFS)
│   └── logs/
│       └── cleaning_log.csv    # ETL cleaning log
├── db/
│   └── schema.sql              # Database schema
├── backend/
│   └── app.py                  # Flask API application
├── frontend/
│   ├── index.html              # Dashboard HTML
│   ├── main.js                 # Frontend JavaScript
│   └── style.css               # Dashboard styling
└── logs/                       # Application logs
    ├── backend.log
    └── frontend.log
```

## Technology Stack

### Backend
- **Framework**: Flask 3.0.3 with SQLAlchemy ORM
- **Database**: MySQL 8.0
- **Server**: Gunicorn (production), Flask dev server (development)
- **Data Processing**: Pandas, NumPy
- **Database Driver**: PyMySQL

### Frontend
- **JavaScript**: Vanilla ES6+
- **Charts**: Chart.js 3.9.1
- **Styling**: Modern CSS with Grid and Flexbox
- **Server**: Python HTTP server (development)

### DevOps
- **Containerization**: Docker & Docker Compose
- **Version Control**: Git with Git LFS
- **Environment**: Python virtual environments

## Database Schema

The project uses a normalized 3-table schema:

### Tables

1. **vendors**: Taxi companies or data vendors
   - vendor_id (PK)
   - vendor_code
   - vendor_name
   - notes

2. **zones**: Geographic zones (neighborhoods, boroughs)
   - zone_id (PK)
   - zone_name
   - borough
   - centroid_lat, centroid_lon
   - shapefile_id

3. **trips**: Main fact table with trip records
   - id (PK)
   - vendor_id (FK)
   - pickup_datetime, dropoff_datetime
   - pickup_lat, pickup_lon
   - dropoff_lat, dropoff_lon
   - pickup_zone_id (FK), dropoff_zone_id (FK)
   - passenger_count
   - trip_distance_km, trip_duration_seconds
   - fare_amount, tip_amount
   - trip_speed_kmh, fare_per_km, tip_pct
   - hour_of_day, day_of_week

## License

MIT License - Free to use, modify, and distribute.

## Support and Resources

- **Troubleshooting**: See sections above for common issues
- **API Documentation**: Built-in at http://localhost:3000/
- **Error Logs**: Check `logs/` directory
- **Cleaning Logs**: Check `data/logs/cleaning_log.csv`
- **Video Walkthrough**: [Complete setup guide](https://youtu.be/zvtoBLHEkJs)

## Contributors

Team 17 - Urban Mobility Data Explorer
- Full-stack development
- Data engineering
- Database design
- Interactive visualizations

## Acknowledgments

- NYC Taxi & Limousine Commission for providing open data
- Flask and SQLAlchemy communities
- Chart.js for visualization library

# github link
https://github.com/u-kevine/urban-mobility-data.git
