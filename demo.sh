#!/bin/bash

# Demo script for Urban Mobility Data Explorer
# This script helps users quickly test the application

echo "Urban Mobility Data Explorer - Demo Setup"
echo "========================================"
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

# Check if backend is running
echo "Checking backend status..."
if check_port 5001; then
    echo "✓ Backend server is running on port 5001"
    
    # Test API health
    if curl -s http://localhost:5001/health >/dev/null 2>&1; then
        echo "✓ Backend API is responding"
    else
        echo "⚠ Backend server found but API not responding"
    fi
else
    echo "✗ Backend server not running on port 5001"
    echo ""
    echo "To start the backend server, run:"
    echo "  ./start_server.sh    (for production mode)"
    echo "  ./start_dev.sh       (for development mode)"
    echo ""
fi

# Check if frontend is running
echo ""
echo "Checking frontend status..."
if check_port 8081; then
    echo "✓ Frontend server is running on port 8081"
    echo "✓ Dashboard available at: http://localhost:8081"
else
    echo "✗ Frontend server not running on port 8081"
    echo ""
    echo "To start the frontend server, run:"
    echo "  cd frontend && python3 -m http.server 8081"
    echo ""
fi

# Show system information
echo ""
echo "System Information:"
echo "==================="
echo "Python version: $(python3 --version 2>/dev/null || echo 'Not found')"
echo "Current directory: $(pwd)"
echo "Available endpoints (if backend is running):"
echo "  - Health check: http://localhost:5001/health"
echo "  - API summary: http://localhost:5001/api/summary"
echo "  - Trip data: http://localhost:5001/api/trips"
echo ""

# Quick start instructions
echo "Quick Start Instructions:"
echo "========================"
echo "1. Start the backend:    ./start_server.sh"
echo "2. Start the frontend:   cd frontend && python3 -m http.server 8081"
echo "3. Open browser:         http://localhost:8081"
echo ""
echo "For more information, see README.md"
