#!/bin/bash
#Stop all running services

echo "Stopping Urban Mobility Data Explorer"
echo "====================================="
echo ""

STOPPED_COUNT=0

# Function to check if process is running
is_running() {
    ps -p $1 > /dev/null 2>&1
}

# Stop backend
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if is_running $BACKEND_PID; then
        echo "🛑 Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        
        # Wait for graceful shutdown
        COUNTER=0
        while is_running $BACKEND_PID && [ $COUNTER -lt 10 ]; do
            sleep 1
            COUNTER=$((COUNTER + 1))
        done
        
        # Force kill if still running
        if is_running $BACKEND_PID; then
            echo "   Force stopping backend..."
            kill -9 $BACKEND_PID 2>/dev/null
        fi
        
        echo "✅ Backend stopped"
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    else
        echo "ℹ️  Backend process not running (PID: $BACKEND_PID)"
    fi
    rm -f .backend.pid
else
    echo "ℹ️  No backend PID file found"
fi

# Stop frontend
if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if is_running $FRONTEND_PID; then
        echo "🛑 Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        
        # Wait for graceful shutdown
        COUNTER=0
        while is_running $FRONTEND_PID && [ $COUNTER -lt 10 ]; do
            sleep 1
            COUNTER=$((COUNTER + 1))
        done
        
        # Force kill if still running
        if is_running $FRONTEND_PID; then
            echo "   Force stopping frontend..."
            kill -9 $FRONTEND_PID 2>/dev/null
        fi
        
        echo "✅ Frontend stopped"
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    else
        echo "ℹ️  Frontend process not running (PID: $FRONTEND_PID)"
    fi
    rm -f .frontend.pid
else
    echo "ℹ️  No frontend PID file found"
fi

# Also try to kill by port if PIDs didn't work
echo ""
echo "🔍 Checking for any remaining processes on ports..."

# Function to kill process on port
kill_port() {
    local port=$1
    local name=$2
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo "   Found process on port $port (PID: $pid) - stopping $name..."
        kill $pid 2>/dev/null
        sleep 1
        
        # Force kill if still running
        if lsof -ti:$port >/dev/null 2>&1; then
            kill -9 $pid 2>/dev/null
        fi
        echo "   ✅ Stopped $name on port $port"
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    fi
}

# Kill anything on port 3000 (backend)
kill_port 3000 "backend"

# Kill anything on port 8080 (frontend)
kill_port 8080 "frontend"

# Final verification
echo ""
echo "🔍 Final verification..."
sleep 1

BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Warning: Port 3000 still in use"
    BACKEND_RUNNING=true
fi

if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Warning: Port 8080 still in use"
    FRONTEND_RUNNING=true
fi

echo ""
echo "═══════════════════════════════════════════════════════"
if [ "$BACKEND_RUNNING" = false ] && [ "$FRONTEND_RUNNING" = false ]; then
    echo "✅ All services stopped successfully!"
    if [ $STOPPED_COUNT -gt 0 ]; then
        echo "   Stopped $STOPPED_COUNT service(s)"
    fi
else
    echo "⚠️  Some services may still be running"
    echo "   Try manually: sudo lsof -ti:3000,8080 | xargs kill -9"
fi
echo "═══════════════════════════════════════════════════════"
echo ""

# Clean up log files (optional)
if [ -d "logs" ] && [ "$(ls -A logs 2>/dev/null)" ]; then
    echo "💡 Tip: View recent logs:"
    echo "   Backend:  tail logs/backend.log"
    echo "   Frontend: tail logs/frontend.log"
    echo ""
fi

echo "🚀 To start services again:"
echo "   ./start_all.sh    (start everything)"
echo "   ./start_server.sh (backend only)"
echo "   ./demo.sh         (check status)"
echo ""