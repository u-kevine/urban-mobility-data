#!/bin/bash
#Production startup script

echo "Starting Urban Mobility Data Explorer - Production Mode"
echo "========================================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "backend/app.py" ]; then
    echo "❌ Error: backend/app.py not found"
    echo "Please run this script from the project root directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Check if required packages are installed
echo "📦 Checking dependencies..."
python3 -c "import flask, sqlalchemy, flask_cors, pymysql" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Error: Required Python packages not found"
    echo "Please run: pip3 install -r requirements.txt"
    exit 1
fi
echo "✅ Dependencies OK"
echo ""

# Set environment variables
export FLASK_ENV=production
export PORT=3000
export DATABASE_URL="${DATABASE_URL:-mysql+pymysql://my_user:my_password@localhost:3306/my_database}"

echo "🔧 Configuration:"
echo "   Port: $PORT"
echo "   Environment: $FLASK_ENV"
echo "   Database: ${DATABASE_URL%%@*}@***"  # Hide password
echo ""

# Navigate to backend directory
cd backend

# Check if Gunicorn is available
if command -v gunicorn &> /dev/null; then
    echo "🚀 Starting API server with Gunicorn on port $PORT..."
    echo ""
    echo "   API will be available at: http://localhost:$PORT"
    echo "   Health check: http://localhost:$PORT/health"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --access-logfile - app:app
else
    echo "⚠️  Gunicorn not found, falling back to Flask development server"
    echo "   For production use, install Gunicorn: pip3 install gunicorn"
    echo ""
    echo "🚀 Starting API server with Flask on port $PORT..."
    echo ""
    echo "   API will be available at: http://localhost:$PORT"
    echo "   Health check: http://localhost:$PORT/health"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python3 app.py
fi