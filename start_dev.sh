#!/bin/bash

# Development startup script for Urban Mobility Data Explorer
# This script starts the Flask development server with debug mode enabled

echo "Starting Urban Mobility Data Explorer - Development Mode"
echo "======================================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if required packages are installed
echo "Checking dependencies..."
python3 -c "import flask, sqlalchemy, flask_cors" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Error: Required Python packages not found. Please run: pip3 install -r requirements.txt"
    exit 1
fi

# Set environment variables for development
export FLASK_ENV=development
export FLASK_DEBUG=1
export PORT=5001

echo "Starting Flask development server on port 5001..."
echo "Debug mode: ENABLED"
echo "Auto-reload: ENABLED"
echo ""
echo "API will be available at: http://localhost:5001"
echo "Press Ctrl+C to stop the server"
echo ""

cd backend
python3 app.py
