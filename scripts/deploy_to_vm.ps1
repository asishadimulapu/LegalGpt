# VM Deployment Script for Windows PowerShell
# This script connects to your Azure VM and updates the application
#
# Required environment variables:
#   SSH_KEY     - Path to your SSH private key file
#   VM_USER     - Username for VM connection
#   VM_HOST     - VM IP address or hostname
#   PROJECT_DIR - (Optional) Project directory on VM, defaults to ~/Major-Project
#
# Example setup:
#   $env:SSH_KEY = "C:/path/to/your-key.pem"
#   $env:VM_USER = "azureuser"
#   $env:VM_HOST = "your-vm-ip"

# Read from environment variables
$SSH_KEY = $env:SSH_KEY
$VM_USER = $env:VM_USER
$VM_HOST = $env:VM_HOST
$PROJECT_DIR = if ($env:PROJECT_DIR) { $env:PROJECT_DIR } else { "~/Major-Project" }

# Validate required variables
if (-not $SSH_KEY) {
    Write-Host "❌ Error: SSH_KEY environment variable is not set" -ForegroundColor Red
    exit 1
}
if (-not $VM_USER) {
    Write-Host "❌ Error: VM_USER environment variable is not set" -ForegroundColor Red
    exit 1
}
if (-not $VM_HOST) {
    Write-Host "❌ Error: VM_HOST environment variable is not set" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Starting deployment to VM..." -ForegroundColor Green
Write-Host "VM: $VM_USER@$VM_HOST" -ForegroundColor Cyan

# Upload the update script to VM (use script directory for correct path)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$UpdateScriptPath = Join-Path $ScriptDir "update_vm.sh"

Write-Host "`n📤 Uploading update script to VM..." -ForegroundColor Yellow
scp -i $SSH_KEY "$UpdateScriptPath" "${VM_USER}@${VM_HOST}:~/"

# Make the script executable and run it
Write-Host "`n🔄 Executing update on VM..." -ForegroundColor Yellow
ssh -i $SSH_KEY "${VM_USER}@${VM_HOST}" "chmod +x ~/update_vm.sh && ~/update_vm.sh"

Write-Host "`n✅ Deployment completed!" -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
