# Check VM application status
# Usage: Set environment variables SSH_KEY, VM_USER, VM_HOST before running
# Or create a .env file and source it

# Read from environment variables
$SSH_KEY = $env:SSH_KEY
$VM_USER = $env:VM_USER
$VM_HOST = $env:VM_HOST

# Validate required variables
if (-not $SSH_KEY) {
    Write-Host "❌ Error: SSH_KEY environment variable is not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:SSH_KEY = 'path/to/your/key.pem'" -ForegroundColor Yellow
    exit 1
}
if (-not $VM_USER) {
    Write-Host "❌ Error: VM_USER environment variable is not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:VM_USER = 'your-username'" -ForegroundColor Yellow
    exit 1
}
if (-not $VM_HOST) {
    Write-Host "❌ Error: VM_HOST environment variable is not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:VM_HOST = 'your-vm-ip'" -ForegroundColor Yellow
    exit 1
}

Write-Host "📊 Checking VM status..." -ForegroundColor Cyan
Write-Host ""

ssh -i $SSH_KEY "${VM_USER}@${VM_HOST}" @"
echo '=== Running Processes ==='
ps aux | grep -E 'python|node|uvicorn|vite' | grep -v grep

echo ''
echo '=== Port Usage ==='
netstat -tlnp 2>/dev/null | grep -E '8000|5173' || ss -tlnp 2>/dev/null | grep -E '8000|5173'

echo ''
echo '=== Recent Backend Logs ==='
tail -n 20 ~/Major-Project/logs/backend.log 2>/dev/null || echo 'No backend logs found'

echo ''
echo '=== Recent Frontend Logs ==='
tail -n 20 ~/Major-Project/logs/frontend.log 2>/dev/null || echo 'No frontend logs found'
"@
