#!/bin/bash
#Demo script for Urban Mobility Data Explorer

echo "Urban Mobility Data Explorer - Demo Setup"
echo "=========================================="
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if we're in the right directory
if [ ! -f "backend/app.py" ]; then
    echo "⚠️  Warning: backend/app.py not found"
    echo "Please run this script from the project root directory"
    echo "Current directory: $(pwd)"
    echo ""
fi

# Check if backend is running
echo "🔍 Checking backend status..."
if check_port 3000; then
    echo "✅ Backend server is running on port 3000"
    
    # Test API health
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Backend API is responding"
        
        # Get trip count
        HEALTH_DATA=$(curl -s http://localhost:3000/health)
        TRIPS=$(echo $HEALTH_DATA | grep -o '"trips_count":[0-9]*' | grep -o '[0-9]*')
        if [ ! -z "$TRIPS" ]; then
            echo "   📊 Database has $(printf "%'d" $TRIPS) trips"
        fi
    else
        echo "⚠️  Backend server found but API not responding"
    fi
else
    echo "❌ Backend server not running on port 3000"
    echo ""
    echo "To start the backend server, run:"
    echo "  ./start_server.sh    (for production mode)"
    echo "  ./start_dev.sh       (for development mode)"
    echo ""
fi

# Check if frontend is running
echo ""
echo "🔍 Checking frontend status..."
if check_port 8080; then
    echo "✅ Frontend server is running on port 8080"
    echo "   🌐 Dashboard available at: http://localhost:8080"
else
    echo "❌ Frontend server not running on port 8080"
    echo ""
    echo "To start the frontend server, run:"
    echo "  cd frontend && python3 -m http.server 8080"
    echo ""
fi

# Check database connection
echo ""
echo "🔍 Checking database status..."
if command -v mysql &> /dev/null; then
    # Try Docker MySQL first
    if docker ps --format '{{.Names}}' | grep -q mysql_db; then
        echo "✅ MySQL Docker container is running"
        if docker exec mysql_db mysqladmin -u my_user -pmy_password ping > /dev/null 2>&1; then
            echo "✅ Database is accessible"
            TRIP_COUNT=$(docker exec mysql_db mysql -u my_user -pmy_password -se "SELECT COUNT(*) FROM trips" my_database 2>/dev/null)
            if [ ! -z "$TRIP_COUNT" ]; then
                echo "   📊 Database contains $(printf "%'d" $TRIP_COUNT) trips"
            fi
        else
            echo "⚠️  Database connection issue"
        fi
    # Try local MySQL
    elif mysql -u my_user -pmy_password -e "USE my_database; SELECT COUNT(*) FROM trips;" 2>/dev/null | tail -1 | grep -E '^[0-9]+$' >/dev/null; then
        TRIP_COUNT=$(mysql -u my_user -pmy_password -se "SELECT COUNT(*) FROM trips" my_database 2>/dev/null)
        echo "✅ Local MySQL database connected - $(printf "%'d" $TRIP_COUNT) trips loaded"
    else
        echo "⚠️  Database connection issue or no data loaded"
        echo "   Run ETL script to load data: python3 etl.py --help"
    fi
else
    echo "⚠️  MySQL client not found in PATH"
    echo "   Install with: sudo apt install mysql-client"
fi

# Show system information
echo ""
echo "📋 System Information:"
echo "====================="
echo "Python version: $(python3 --version 2>/dev/null || echo 'Not found')"
echo "Project directory: $(pwd)"
echo ""
echo "📡 Available endpoints (if backend is running):"
echo "   - Health check:    http://localhost:3000/health"
echo "   - API summary:     http://localhost:3000/api/summary"
echo "   - Trip data:       http://localhost:3000/api/trips"
echo "   - Hotspots:        http://localhost:3000/api/hotspots"
echo "   - Top routes:      http://localhost:3000/api/top-routes"
echo "   - Insights:        http://localhost:3000/api/insights"
echo ""

# Quick start instructions
echo "🚀 Quick Start Instructions:"
echo "============================"
echo "1. Start the backend:    ./start_server.sh (in one terminal)"
echo "2. Start the frontend:   cd frontend && python3 -m http.server 8080 (in another terminal)"
echo "3. Open browser:         http://localhost:8080"
echo ""
echo "📚 For more information, see README.md"
echo ""

# Show current status summary
echo "📊 Status Summary:"
echo "=================="
if [ -f "backend/app.py" ]; then
    echo "✅ Project files:   Found"
else
    echo "❌ Project files:   Not found (wrong directory?)"
fi
check_port 3000 && echo "✅ Backend:         Running" || echo "❌ Backend:         Stopped"
check_port 8080 && echo "✅ Frontend:        Running" || echo "❌ Frontend:        Stopped"

echo ""