#!/bin/bash
# =============================================================================
# restart_backend.sh - Restart uvicorn backend
# Used by CI/CD pipeline to safely restart without pkill self-matching
# =============================================================================

echo "Stopping existing uvicorn processes..."
# Use pgrep to find PIDs, then kill them individually
# This avoids pkill -f matching the calling script
PIDS=$(pgrep -f 'uvicorn' 2>/dev/null || true)
if [ -n "$PIDS" ]; then
    echo "Found uvicorn PIDs: $PIDS"
    for PID in $PIDS; do
        sudo kill $PID 2>/dev/null || true
    done
    sleep 3
    # Force kill if still running
    for PID in $PIDS; do
        sudo kill -9 $PID 2>/dev/null || true
    done
    sleep 1
    echo "✓ Old processes stopped"
else
    echo "No existing uvicorn processes found"
fi

echo "Starting new uvicorn process..."
cd /home/azureuser/LegalGpt
source venv/bin/activate
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /home/azureuser/legalgpt.log 2>&1 &
NEW_PID=$!
echo "✓ Started uvicorn with PID: $NEW_PID"

# Wait for startup
echo "Waiting for backend to start..."
sleep 15

# Health check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Backend is healthy (HTTP $HTTP_STATUS)"
    exit 0
else
    echo "❌ Health check failed (HTTP $HTTP_STATUS)"
    tail -20 /home/azureuser/legalgpt.log
    exit 1
fi
