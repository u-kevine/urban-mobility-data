#!/bin/bash
#Development startup script

echo "Starting Urban Mobility Data Explorer - Development Mode"
echo "========================================================="
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

# Set environment variables for development
export FLASK_ENV=development
export FLASK_DEBUG=1
export PORT=3000
export DATABASE_URL="${DATABASE_URL:-mysql+pymysql://my_user:my_password@localhost:3306/my_database}"

echo "🔧 Configuration:"
echo "   Port: $PORT"
echo "   Environment: $FLASK_ENV"
echo "   Debug mode: ENABLED"
echo "   Auto-reload: ENABLED"
echo "   Database: ${DATABASE_URL%%@*}@***"  # Hide password
echo ""

echo "🚀 Starting Flask development server on port $PORT..."
echo ""
echo "   API will be available at: http://localhost:$PORT"
echo "   Health check: http://localhost:$PORT/health"
echo ""
echo "   💡 Development features:"
echo "      - Detailed error messages"
echo "      - Stack traces in browser"
echo "      - Auto-reload on code changes"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Navigate to backend directory and start
cd backend
python3 app.py
