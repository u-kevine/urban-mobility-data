# Urban Mobility Data Explorer

A comprehensive full-stack application for analyzing New York City taxi trip patterns using real-world datasets. This project demonstrates enterprise-level data processing, database design, and interactive visualization capabilities for urban mobility insights.

## Project Overview

This application processes raw NYC taxi trip data to provide meaningful insights into urban transportation patterns. The system includes data cleaning pipelines, a normalized relational database, a REST API backend, and an interactive web dashboard for data exploration and analysis.

## Key Features

- **Data Processing Pipeline**: Automated cleaning and enrichment of raw taxi trip records
- **Interactive Dashboard**: Real-time analytics with dynamic filtering and visualizations
- **Geographic Analysis**: Pickup hotspots and route pattern identification
- **Statistical Insights**: Trip duration, distance, fare, and speed analysis
- **Modern Interface**: Responsive design with dark and light theme support
- **Advanced Filtering**: Filter data by date ranges, distance, fare amounts, and more

## Recent Updates

### Version 2.0 - Enhanced Dashboard and Mock Data Support

**New Features:**
- **Mock Data Integration**: Application now works seamlessly without database setup using realistic sample data
- **Enhanced Visualizations**: Added top routes analysis and comprehensive insights dashboard
- **Improved Architecture**: Separated CSS and JavaScript into external files for better maintainability
- **Professional Interface**: Removed decorative elements for a clean, academic presentation
- **Robust Error Handling**: Automatic fallback to demo data when database is unavailable
- **Production Scripts**: Added startup scripts for both development and production environments

**Technical Improvements:**
- Modular frontend architecture with separate style.css and main.js files
- Enhanced API endpoints with comprehensive mock data support
- Improved database connection handling with automatic fallback
- Better error messages and status indicators
- Responsive design optimizations for various screen sizes

## Quick Start

### System Requirements

- Python 3.8 or higher
- pip package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)
- At least 4GB RAM for data processing

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/u-kevine/urban-mobility-data.git
   cd urban-mobility-data
   ```

2. **Install Python Dependencies**
   ```bash
   pip3 install -r requirements.txt
   ```

3. **Verify Installation**
   Check that all required packages are installed correctly by running the health check.

### Running the Application

#### Method 1: Production Setup (Recommended)
```bash
./start_server.sh
```
This command starts the optimized API server using Gunicorn on `http://127.0.0.1:5001`

#### Method 2: Development Setup
```bash
./start_dev.sh
```
This starts the Flask development server with debugging enabled for development purposes.

#### Starting the Frontend Dashboard
```bash
cd frontend
python3 -m http.server 8081
```
Open your web browser and navigate to `http://localhost:8081` to access the interactive dashboard.

### Available API Endpoints

The backend provides a comprehensive REST API for data access:

- **`GET /health`** - System health check and database connection status
- **`GET /api/summary`** - Aggregate statistics (total trips, averages, etc.)
- **`GET /api/trips`** - Paginated trip records with filtering support
- **`GET /api/hotspots`** - Top pickup locations and zones
- **`GET /api/top-routes`** - Most popular pickup-to-dropoff routes
- **`GET /api/insights`** - Advanced analytics and pattern analysis
- **`GET /api/fare-stats`** - Detailed fare and pricing analysis

### Database Configuration

The application supports both development and production database setups:

**Development Mode**: Uses built-in sample data for testing and demonstration purposes.

**Production Mode**: Connect to a MySQL database by setting the environment variable:
```bash
export DATABASE_URL="mysql+pymysql://username:password@localhost:3306/database_name"
```

### Project Architecture

The application follows a clean three-tier architecture:

```
Project Structure:
├── backend/              # Flask REST API server
│   ├── app.py           # Main application and route handlers
│   └── config.py        # Configuration management
├── frontend/            # Web dashboard interface
│   ├── index.html       # Main dashboard page
│   ├── main.js          # JavaScript application logic
│   └── style.css        # User interface styling
├── data/                # Raw and processed datasets
├── db/                  # Database schema and migrations
└── etl/                 # Data processing and cleaning scripts
```

### Technology Stack

**Backend Technologies:**
- Flask web framework with SQLAlchemy ORM
- MySQL database with connection pooling
- CORS support for cross-origin requests
- Gunicorn WSGI server for production deployment

**Frontend Technologies:**
- Modern vanilla JavaScript (ES6+)
- Chart.js for interactive data visualizations
- Responsive CSS with CSS Grid and Flexbox
- Dark and light theme support

## Data Processing and Analysis

### Dataset Information

This project uses the official New York City Taxi Trip dataset, which includes:
- Pickup and dropoff timestamps and coordinates
- Trip duration, distance, and calculated speed metrics
- Fare amounts, tips, and payment information
- Passenger counts and vendor details
- Derived features like fare per kilometer and trip efficiency metrics

### Key Analytical Features

**Custom Algorithm Implementation**: The system includes manually implemented data structures and algorithms for:
- Trip clustering and hotspot detection
- Route optimization and pattern analysis
- Statistical outlier detection and data cleaning
- Custom sorting and filtering algorithms

**Data Insights Generated**:
- Rush hour traffic pattern analysis
- Geographic pickup and dropoff hotspots
- Fare pricing trends and anomaly detection
- Speed and efficiency metrics across different zones
- Seasonal and temporal usage patterns

## Troubleshooting

### Common Issues

**Backend Connection Problems**:
- Ensure the Flask server is running on port 5001
- Check that all Python dependencies are installed
- Verify database connection if using production mode

**Frontend Display Issues**:
- Clear browser cache and reload the page
- Ensure JavaScript is enabled in your browser
- Check browser console for any error messages

**Data Loading Problems**:
- Verify the backend API is responding at `/health` endpoint
- Check network connectivity between frontend and backend
- Ensure proper CORS configuration if running on different ports

### Performance Optimization

For large datasets, consider:
- Implementing database indexing on frequently queried columns
- Using pagination for large result sets
- Enabling database connection pooling
- Implementing client-side caching for static data

## Development and Contribution

### Setting Up Development Environment

1. **Backend Development**:
   ```bash
   cd backend
   python app.py  # Runs with debug mode enabled
   ```

2. **Frontend Development**:
   ```bash
   cd frontend
   python3 -m http.server 8081
   ```

3. **Database Setup** (Optional):
   - Install MySQL or use Docker container
   - Create database schema using provided SQL files
   - Configure environment variables

### Code Quality Standards

- Follow PEP 8 style guidelines for Python code
- Use meaningful variable and function names
- Include comprehensive error handling
- Write clear documentation and comments
- Test all API endpoints thoroughly

### Contributing Guidelines

We welcome contributions to improve the Urban Mobility Data Explorer:

1. **Fork the Repository**: Create your own copy of the project
2. **Create Feature Branch**: Work on new features in separate branches
3. **Follow Standards**: Maintain code quality and documentation standards
4. **Test Thoroughly**: Ensure all functionality works as expected
5. **Submit Pull Request**: Provide clear description of changes made

## License and Academic Use

This project is developed for educational and research purposes. The codebase demonstrates enterprise-level software development practices including data processing, API design, and interactive visualization techniques.

**License**: MIT License - Feel free to use, modify, and distribute according to license terms.

**Academic Integrity**: This project represents original work and demonstrates understanding of full-stack development, data analysis, and system architecture principles.
