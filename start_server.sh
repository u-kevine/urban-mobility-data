#!/bin/bash

# Production startup script for Urban Mobility Data Explorer
# This script starts the Flask API server using Gunicorn for production use

echo "Starting Urban Mobility Data Explorer - Production Mode"
echo "=================================================="

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

# Set environment variables
export FLASK_ENV=production
export PORT=5001

# Check if Gunicorn is available
if command -v gunicorn &> /dev/null; then
    echo "Starting API server with Gunicorn on port 5001..."
    cd backend
    gunicorn --bind 0.0.0.0:5001 --workers 4 --timeout 120 app:app
else
    echo "Gunicorn not found, falling back to Flask development server..."
    echo "For production use, install Gunicorn: pip3 install gunicorn"
    cd backend
    python3 app.py
fi
