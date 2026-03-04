#!/bin/bash

# Exit on error
set -e

PROJECT_ROOT=$(pwd)
VENV_PATH="$PROJECT_ROOT/backend/venv"
PYTHON_BIN="$VENV_PATH/bin/python"

echo "🚀 Starting Visitor Management Development Environment..."

# Helper to check if a port is busy
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0 # Busy
    else
        return 1 # Free
    fi
}

# Function to stop background processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    kill $TAIL_PID 2>/dev/null || true
    # Kill the sed processes
    pkill -P $TAIL_PID 2>/dev/null || true
    exit
}

trap cleanup SIGINT SIGTERM

# Check for port conflicts early
if check_port 8001; then
    echo "❌ Error: Port 8001 is already in use."
    echo "   Try stopping the process using it: lsof -i :8001"
    exit 1
fi

if check_port 3000; then
    echo "❌ Error: Port 3000 is already in use."
    echo "   Try stopping the process using it: lsof -i :3000"
    exit 1
fi

# Check if Virtual Environment exists
if [ ! -f "$PYTHON_BIN" ]; then
    echo "⚠️  Virtual environment not found. Setting it up..."
    python3 -m venv "$VENV_PATH" || true
    if [ ! -f "$VENV_PATH/bin/pip" ]; then
        echo "📦 Installing pip in venv..."
        curl https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
        "$PYTHON_BIN" /tmp/get-pip.py
    fi
    echo "📥 Installing dependencies..."
    "$VENV_PATH/bin/pip" install -r backend/requirements.txt
fi

# Run seeding script if requested
if [[ "$1" == "--seed" ]]; then
    echo "🌱 Seeding demo data..."
    "$PYTHON_BIN" backend/setup_demo.py
fi

# Clear old logs
> /tmp/backend.log
> /tmp/frontend.log

# Start Backend
echo "📡 Starting Backend (Django) on http://localhost:8001..."
cd backend
"$PYTHON_BIN" manage.py runserver 0.0.0.0:8001 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "💻 Starting Frontend (Next.js) on http://localhost:3000..."
cd frontend
npm run dev -- -p 3000 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "✅ Both servers are running!"
echo "📖 Streaming logs (Ctrl+C to stop)..."
echo ""

# Stream logs with prefixes (Blue for Backend, Green for Frontend)
(
  tail -f /tmp/backend.log | sed "s/^/$(printf '\033[34m[BACKEND]\033[0m') /" &
  tail -f /tmp/frontend.log | sed "s/^/$(printf '\033[32m[FRONTEND]\033[0m') /" &
  wait
) &
TAIL_PID=$!

# Keep script running
wait
