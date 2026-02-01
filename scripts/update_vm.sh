#!/bin/bash
# VM Update Script - Runs on the Azure VM
# This script pulls latest changes and restarts services

set -e  # Exit on any error

PROJECT_DIR="$HOME/LegalGpt"
BACKEND_PORT=8000
FRONTEND_PORT=5173

echo "🔍 Checking project directory..."
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory not found at $PROJECT_DIR"
    echo "Please update PROJECT_DIR in this script"
    exit 1
fi

cd "$PROJECT_DIR"

echo ""
echo "📥 Pulling latest changes from GitHub..."
# Stash any local changes and pull
git stash push -m "Auto-stash before deployment $(date)"
git pull origin main || git pull origin master
# Optionally apply stashed changes back (comment out if you want to discard local changes)
# git stash pop

echo ""
echo "🛑 Stopping existing services..."
# Kill existing Python backend
pkill -f "uvicorn" || true
pkill -f "python.*run.py" || true

# Kill existing Node frontend (if running)
pkill -f "vite" || true
pkill -f "node.*frontend" || true

sleep 2

echo ""
echo "📦 Updating Python dependencies..."
if [ -f "requirements.txt" ]; then
    source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
    pip install -r requirements.txt --quiet
fi

echo ""
echo "📦 Updating Frontend dependencies..."
if [ -f "frontend/package.json" ]; then
    cd frontend
    if [ -f "package-lock.json" ]; then
        npm ci --quiet
    else
        npm install --quiet
    fi
    cd ..
fi

echo ""
echo "� Ensuring logs directory exists..."
mkdir -p "$PROJECT_DIR/logs"
if [ ! -w "$PROJECT_DIR/logs" ]; then
    echo "❌ Error: logs directory is not writeable"
    exit 1
fi
echo "✅ Logs directory ready: $PROJECT_DIR/logs"

echo ""
echo "�🚀 Starting Backend service..."
source venv/bin/activate
nohup python run.py > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

echo ""
echo "🚀 Starting Frontend service..."
cd frontend
nohup npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"
cd ..

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "📝 Logs:"
echo "  Backend:  tail -f $PROJECT_DIR/logs/backend.log"
echo "  Frontend: tail -f $PROJECT_DIR/logs/frontend.log"
echo ""
