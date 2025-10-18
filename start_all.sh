#!/bin/bash
#Start both backend and frontend

echo "Starting Urban Mobility Data Explorer - Complete Stack"
echo "======================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "backend/app.py" ]; then
    echo "❌ Error: backend/app.py not found. Run from project root directory."
    echo "Current directory: $(pwd)"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found."
    exit 1
fi

# Function to check if port is in use
check_port() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Check if services are already running
if check_port 3000; then
    echo "⚠️  Port 3000 is already in use. Backend may already be running."
    echo "   Stop existing services first: ./stop_all.sh"
    exit 1
fi

if check_port 8080; then
    echo "⚠️  Port 8080 is already in use. Frontend may already be running."
    echo "   Stop existing services first: ./stop_all.sh"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

echo "🚀 Starting backend server..."
echo "   This will take a few seconds..."

# Start backend using nohup (works better for backgrounding)
cd backend
nohup python3 app.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "   Backend PID: $BACKEND_PID"
echo "   Logs: logs/backend.log"

# Save backend PID
echo $BACKEND_PID > .backend.pid

# Wait for backend to start
echo "   Waiting for backend to initialize..."
sleep 3

# Check if backend started successfully with better retry logic
RETRIES=0
MAX_RETRIES=15
BACKEND_UP=false

while [ $RETRIES -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Backend is running and healthy"
        BACKEND_UP=true
        break
    else
        RETRIES=$((RETRIES + 1))
        if [ $RETRIES -eq $MAX_RETRIES ]; then
            echo "❌ Backend failed to start after ${MAX_RETRIES} retries"
            echo ""
            echo "📋 Last 20 lines of backend log:"
            echo "================================"
            tail -n 20 logs/backend.log
            echo ""
            echo "💡 Try starting manually to see full error:"
            echo "   cd backend && python3 app.py"
            kill $BACKEND_PID 2>/dev/null
            rm -f .backend.pid
            exit 1
        fi
        echo "   Checking backend... ($RETRIES/$MAX_RETRIES)"
        sleep 2
    fi
done

if [ "$BACKEND_UP" = false ]; then
    echo "❌ Backend startup failed"
    exit 1
fi

# Start frontend
echo ""
echo "🚀 Starting frontend server..."
cd frontend
nohup python3 -m http.server 8080 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   Frontend PID: $FRONTEND_PID"
echo "   Logs: logs/frontend.log"

# Save frontend PID
echo $FRONTEND_PID > .frontend.pid

# Wait a moment for frontend to start
sleep 2

# Verify frontend started
if curl -s http://localhost:8080 >/dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend might still be starting..."
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ All services started successfully!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📡 Access points:"
echo "   🌐 Dashboard:     http://localhost:8080"
echo "   🔌 Backend API:   http://localhost:3000"
echo "   💓 Health check:  http://localhost:3000/health"
echo ""
echo "📋 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 View logs:"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 To stop all services:"
echo "   ./stop_all.sh"
echo ""
echo "💡 Check status at any time:"
echo "   ./demo.sh"
echo ""
echo "═══════════════════════════════════════════════════════"
