# urban-mobility-data
# Urban Mobility Data Explorer

A comprehensive NYC Taxi Dashboard for analyzing urban mobility patterns with real-time analytics and visualizations.

## Features

- Interactive Dashboard - Real-time trip analytics and visualizations
- Pickup Heatmaps - Geographic distribution of taxi pickups
- Route Analysis - Top routes and traffic patterns
- Statistical Insights - Trip duration, distance, fare analysis
- Modern UI - Clean, responsive design with dark/light themes
- Live Filtering - Dynamic data filtering by date, time, distance, and fare

## Quick Start

### Prerequisites

- Python 3.8+
- pip3

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/u-kevine/urban-mobility-data.git
   cd urban-mobility-data
   ```

2. Install dependencies
   ```bash
   pip3 install -r requirements.txt
   ```

### Running the Application

#### Production Mode (Recommended)
```bash
./start_server.sh
```
This starts the API server with gunicorn on `http://127.0.0.1:5001`

#### Development Mode
```bash
./start_dev.sh
```
This starts the Flask development server with debug mode enabled.

#### Frontend
```bash
cd frontend
python3 -m http.server 8081
```
Access the dashboard at `http://localhost:8081`

### API Endpoints

- `GET /health` - Health check and system status
- `GET /api/trips` - Paginated trip data
- `GET /api/heatmap-manual` - Pickup location heatmap data
- `GET /api/top-routes-manual` - Top routes analysis
- `GET /api/summary` - Trip statistics summary
- `GET /api/insights` - Advanced analytics insights

### Configuration

The application automatically falls back to mock data if no database is configured. For production use with real data:

1. Set up a MySQL database
2. Configure the `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL="mysql+pymysql://user:password@localhost:3306/nyc_taxi"
   ```

### Architecture

```
backend/              # Flask API server
  app.py             # Main application
  wsgi.py            # WSGI entry point
frontend/            # Static web application
  index.html         # Main dashboard
  main.js            # JavaScript logic
  style.css          # Styling
data/                # Data files and samples
db/                  # Database schema
```

### Development

- Backend: Flask with SQLAlchemy, CORS enabled
- Frontend: Vanilla JavaScript with Chart.js
- Database: MySQL with fallback to mock data
- Production: Gunicorn WSGI server

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### License

This project is licensed under the MIT License.
