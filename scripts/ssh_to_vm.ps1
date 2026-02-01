# Quick SSH connection to Azure VM
# Usage: Set environment variables SSH_KEY, VM_USER, VM_HOST before running
#
# Required environment variables:
#   SSH_KEY - Path to your SSH private key file
#   VM_USER - Username for VM connection  
#   VM_HOST - VM IP address or hostname (can be resolved via Azure CLI if not set)

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

# Try to resolve VM_HOST via Azure CLI if not set
if (-not $VM_HOST) {
    Write-Host "⚠️ VM_HOST not set, attempting to resolve via Azure CLI..." -ForegroundColor Yellow
    
    # Check if Azure CLI is installed
    $azCmd = Get-Command az -ErrorAction SilentlyContinue
    if ($azCmd) {
        # Try to get the public IP (requires az login and proper resource group/vm name)
        # Customize these values or set VM_HOST directly
        $resourceGroup = $env:AZURE_RESOURCE_GROUP
        $vmName = $env:AZURE_VM_NAME
        
        if ($resourceGroup -and $vmName) {
            $VM_HOST = az vm show -d -g $resourceGroup -n $vmName --query publicIps -o tsv 2>$null
        }
    }
    
    if (-not $VM_HOST) {
        Write-Host "❌ Error: VM_HOST could not be resolved" -ForegroundColor Red
        Write-Host "Set it with: `$env:VM_HOST = 'your-vm-ip'" -ForegroundColor Yellow
        Write-Host "Or set AZURE_RESOURCE_GROUP and AZURE_VM_NAME for auto-resolution" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Resolved VM_HOST: $VM_HOST" -ForegroundColor Green
}

Write-Host "🔐 Connecting to VM..." -ForegroundColor Cyan
ssh -i $SSH_KEY "${VM_USER}@${VM_HOST}"
