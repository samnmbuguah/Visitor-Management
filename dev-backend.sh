#!/bin/bash

# Exit on error
set -e

PROJECT_ROOT=$(cd "$(dirname "$0")" && pwd)
VENV_PATH="$PROJECT_ROOT/backend/venv"
PYTHON_BIN="$VENV_PATH/bin/python"

echo "🚀 Starting Backend (Django)..."

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
    "$VENV_PATH/bin/pip" install -r "$PROJECT_ROOT/backend/requirements.txt"
fi

# Run seeding script if requested
if [[ "$1" == "--seed" ]]; then
    echo "🌱 Seeding demo data..."
    "$PYTHON_BIN" "$PROJECT_ROOT/backend/setup_demo.py"
fi

# Helper to check if a port is busy
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0 # Busy
    else
        return 1 # Free
    fi
}

if check_port 8001; then
    echo "❌ Error: Port 8001 is already in use."
    echo "   Try stopping the process using it: lsof -i :8001"
    exit 1
fi

echo "📡 Backend running on http://localhost:8001"
echo "   Press Ctrl+C to stop."
echo ""

cd "$PROJECT_ROOT/backend"
exec "$PYTHON_BIN" manage.py runserver 0.0.0.0:8001
