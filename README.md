# Urban Mobility Data Explorer

A comprehensive full-stack application for analyzing New York City taxi trip patterns using real-world datasets. This project demonstrates enterprise-level data processing, database design, and interactive visualization capabilities for urban mobility insights.

# Team 17
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

### Step 2: Start Services with Docker Compose

```bash
# Start all services (MySQL, Backend API, Frontend)
docker-compose up -d
```

This command will:
- Pull the MySQL 8.0 image
- Create and start the MySQL container on port 3306
- Set up the database with credentials from docker-compose.yml
- Build and start the frontend container on port 8080
- Build and start the backend API container

**Verify services are running**:
```bash
docker-compose ps
```

Expected output:
```
NAME                COMMAND                  SERVICE             STATUS              PORTS
mysql_db            "docker-entrypoint.s…"   mysql               Up                  0.0.0.0:3306->3306/tcp
backend_api         "gunicorn -w 4 -b 0.…"   backend             Up                  0.0.0.0:3000->3000/tcp
frontend_web        "nginx -g 'daemon of…"   frontend            Up                  0.0.0.0:8080->80/tcp
```

### Step 3: Initialize Database Schema

```bash
# Access MySQL container and create schema
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

### Step 5: Run ETL Process (Load Data)

```bash
# Install Python dependencies (if not already done)
pip install -r requirements.txt

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

### Step 6: Access the Application

Once ETL is complete, access the dashboard:

**Frontend Dashboard**: http://localhost:8080

**Backend API**: http://localhost:3000

**API Health Check**: http://localhost:3000/health

### Step 7: Stop and Manage Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f mysql
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart
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
# Navigate to the database directory
cd db

# Run the schema creation script
mysql -u my_user -pmy_password my_database < schema.sql

# Navigate back to project root
cd ..
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
# Method 1: Using Flask directly
python3 app.py

# Method 2: Using Gunicorn (Production)
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

The project uses Docker Compose for easy deployment. Here's the configuration breakdown:

### docker-compose.yml

```yaml
version: '3.8'

services:
  # MySQL Database
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

  # Backend API
  backend:
    build: .
    container_name: backend_api
    restart: always
    environment:
      DATABASE_URL: mysql+pymysql://my_user:my_password@mysql:3306/my_database
      FLASK_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./data:/app/data
      - ./db:/app/db

  # Frontend Dashboard
  frontend:
    build: ./frontend
    container_name: frontend_web
    restart: always
    ports:
      - "8080:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

### Service Descriptions

**mysql**:
- Uses official MySQL 8.0 image
- Persists data using named volume `mysql_data`
- Uses native password authentication
- Health check ensures database is ready before starting dependent services

**backend**:
- Builds from project root Dockerfile
- Connects to MySQL using internal Docker network
- Exposes port 3000 for API access
- Mounts data and db directories for access to files

**frontend**:
- Builds from frontend/Dockerfile
- Serves static files via Nginx
- Connects to backend API
- Exposes port 8080 for web access

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
   - Persists preference

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
- `date_from` (optional): Start date (YYYY-MM-DD)
- `date_to` (optional): End date (YYYY-MM-DD)
- `distance_min` (optional): Minimum distance filter
- `distance_max` (optional): Maximum distance filter

**Example**:
```bash
curl "http://localhost:3000/api/summary?date_from=2024-01-01&date_to=2024-01-31"
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
- `date_from` (optional): Start date
- `date_to` (optional): End date
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
docker-compose up -d

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

# For Docker, rebuild image
docker-compose build backend
docker-compose up -d backend
```

#### Problem: "500 Internal Server Error"

**Solutions**:
```bash
# Check logs
# For Docker:
docker-compose logs backend

# For local setup:
# Check terminal where app.py is running

# Enable debug mode
export FLASK_DEBUG=1
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

### Using Docker Compose (Recommended)

1. **Update docker-compose.yml for production**:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: mysql_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./db/backups:/backups
    command: >
      --default-authentication-plugin=mysql_native_password
      --max_allowed_packet=256M
      --max_connections=500

  backend:
    build: .
    container_name: backend_api
    restart: always
    environment:
      DATABASE_URL: mysql+pymysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}
      FLASK_ENV: production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs

  frontend:
    build: ./frontend
    container_name: frontend_web
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: nginx_proxy
    restart: always
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  mysql_data:
```

2. **Create production .env file**:

```bash
cat > .env << EOF
MYSQL_ROOT_PASSWORD=strong_root_password_here
MYSQL_DATABASE=my_database
MYSQL_USER=my_user
MYSQL_PASSWORD=strong_password_here
EOF
```

3. **Deploy**:

```bash
docker-compose up -d
```

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
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f mysql

# Monitor resource usage
docker stats

# Check container health
docker-compose ps
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for better query performance
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

1. **Enable caching** (add to app.py):
```python
from flask_caching import Cache

cache = Cache(app, config={
    'CACHE_TYPE': 'simple',
    'CACHE_DEFAULT_TIMEOUT': 300
})

@app.route("/api/summary")
@cache.cached(timeout=60, query_string=True)
def summary():
    # ...existing code...
```

2. **Connection pooling** (already configured in app.py):
```python
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20
)
```

## Project Structure

```
urban-mobility-data/
├── docker-compose.yml          # Docker orchestration
├── Dockerfile                  # Backend container build
├── .dockerignore              # Docker ignore patterns
├── .env                       # Environment variables (not in git)
├── .env.example               # Environment template
├── requirements.txt           # Python dependencies
├── app.py                     # Flask API server
├── etl.py                     # Data processing script
├── config.py                  # Configuration management
├── README.md                  # This file
├── data/
│   ├── raw/
│   │   └── train.csv         # Raw taxi trip data (Git LFS)
│   └── logs/
│       └── cleaning_log.csv  # ETL cleaning log
├── db/
│   ├── schema.sql            # Database schema
│   └── backups/              # Database backups
├── frontend/
│   ├── Dockerfile            # Frontend container build
│   ├── index.html            # Dashboard HTML
│   ├── main.js               # Frontend JavaScript
│   └── style.css             # Dashboard styling
└── logs/                     # Application logs
```

## Technology Stack

### Backend
- **Framework**: Flask 3.0.3 with SQLAlchemy ORM
- **Database**: MySQL 8.0
- **Server**: Gunicorn (production), Flask dev server (development)
- **Data Processing**: Pandas, NumPy

### Frontend
- **JavaScript**: Vanilla ES6+
- **Charts**: Chart.js 3.9.1
- **Styling**: Modern CSS with Grid and Flexbox
- **Server**: Nginx (production), Python HTTP server (development)

### DevOps
- **Containerization**: Docker & Docker Compose
- **Version Control**: Git with Git LFS
- **Environment**: Python virtual environments

## License

MIT License - Free to use, modify, and distribute.

## Support and Resources

- **Troubleshooting**: See sections above for common issues
- **API Documentation**: Built-in at http://localhost:3000/
- **Error Logs**: Check `data/logs/` directory
- **Video Walkthrough**: [Complete setup guide](https://youtu.be/6hXp0vrk6y8)

## Contributors

Team 17 - Urban Mobility Data Explorer
- Full-stack development
- Data engineering
- Database design
- Interactive visualizations
