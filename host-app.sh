#!/bin/bash

# Exit on error
set -e

PROJECT_ROOT=$(cd "$(dirname "$0")" && pwd)
APP_DIR="$PROJECT_ROOT/mobile-host"

echo "🚀 Starting Mobile Host (Expo)..."

# Install dependencies if node_modules is missing
if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "📥 Installing dependencies..."
    cd "$APP_DIR"
    npm install
fi

echo "📱 Launching mobile-host — scan the QR code with Expo Go."
echo "   Press Ctrl+C to stop."
echo ""

cd "$APP_DIR"
export ELECTRON_DISABLE_SANDBOX=1
exec npx expo start --port 8085 --tunnel --clear
