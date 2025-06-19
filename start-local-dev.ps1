# Sticker Shuttle Local Development Environment Launcher
# PowerShell Version with Enhanced Features

$Host.UI.RawUI.WindowTitle = "Sticker Shuttle Dev Environment"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Clear-Host
Write-Host ""
Write-ColorOutput Yellow "============================================================"
Write-ColorOutput Cyan "          STICKER SHUTTLE DEVELOPMENT ENVIRONMENT"
Write-ColorOutput Yellow "============================================================"
Write-Host ""

# Check if running as administrator (optional but recommended)
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-ColorOutput Yellow "Note: Running without administrator privileges."
    Write-ColorOutput Yellow "Some port cleanup operations may be limited."
    Write-Host ""
}

# Check directories
if (-not (Test-Path "api")) {
    Write-ColorOutput Red "ERROR: API directory not found!"
    Write-ColorOutput Red "Please run this script from the project root directory."
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "frontend")) {
    Write-ColorOutput Red "ERROR: Frontend directory not found!"
    Write-ColorOutput Red "Please run this script from the project root directory."
    Read-Host "Press Enter to exit"
    exit 1
}

# Function to kill processes on a specific port
function Stop-ProcessOnPort($port) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | ForEach-Object {
            try {
                Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-ColorOutput Green "✓ Cleared port $port"
            } catch {
                Write-ColorOutput Yellow "⚠ Could not clear port $port (may require admin rights)"
            }
        }
    }
}

Write-ColorOutput Cyan "Cleaning up existing processes..."
Stop-ProcessOnPort 3000
Stop-ProcessOnPort 5000
Start-Sleep -Seconds 2

# Start services
Write-Host ""
Write-ColorOutput Green "[1/3] Starting Stripe CLI webhook forwarding..."
$stripe = Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    `$Host.UI.RawUI.WindowTitle = 'Stripe CLI - Webhook Forwarding'
    Write-Host 'STRIPE CLI - Webhook Forwarding to localhost:5000' -ForegroundColor Cyan
    Write-Host '============================================' -ForegroundColor Yellow
    Write-Host ''
    stripe listen --forward-to localhost:5000/api/webhooks/stripe
    if (`$LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host 'ERROR: Stripe CLI not installed or not in PATH' -ForegroundColor Red
        Write-Host 'Install from: https://stripe.com/docs/stripe-cli' -ForegroundColor Yellow
        Read-Host 'Press Enter to exit'
    }
"@ -PassThru

Start-Sleep -Seconds 3

Write-ColorOutput Green "[2/3] Starting API server on port 5000..."
$api = Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    `$Host.UI.RawUI.WindowTitle = 'API Server - Port 5000'
    Set-Location api
    Write-Host 'API SERVER - Running on http://localhost:5000' -ForegroundColor Cyan
    Write-Host '============================================' -ForegroundColor Yellow
    Write-Host ''
    npm run dev
    if (`$LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host 'ERROR: Failed to start API server' -ForegroundColor Red
        Write-Host 'Try running: npm install' -ForegroundColor Yellow
        Read-Host 'Press Enter to exit'
    }
"@ -PassThru

Start-Sleep -Seconds 3

Write-ColorOutput Green "[3/3] Starting Next.js frontend on port 3000..."
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    `$Host.UI.RawUI.WindowTitle = 'Frontend Server - Port 3000'
    Set-Location frontend
    Write-Host 'FRONTEND SERVER - Running on http://localhost:3000' -ForegroundColor Cyan
    Write-Host '============================================' -ForegroundColor Yellow
    Write-Host ''
    npm run dev
    if (`$LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host 'ERROR: Failed to start frontend' -ForegroundColor Red
        Write-Host 'Try running: npm install' -ForegroundColor Yellow
        Read-Host 'Press Enter to exit'
    }
"@ -PassThru

Write-Host ""
Write-ColorOutput Yellow "============================================================"
Write-Host ""
Write-ColorOutput Green "✅ All services are starting up!"
Write-Host ""
Write-ColorOutput Cyan "Frontend:  http://localhost:3000"
Write-ColorOutput Cyan "API:       http://localhost:5000"
Write-ColorOutput Cyan "GraphQL:   http://localhost:5000/graphql"
Write-Host ""
Write-ColorOutput Magenta "Stripe webhooks are being forwarded to your local API."
Write-Host ""
Write-ColorOutput Yellow "To stop all services:"
Write-ColorOutput Yellow "  - Close each window individually, or"
Write-ColorOutput Yellow "  - Run ./stop-local-dev.ps1"
Write-Host ""
Write-ColorOutput Yellow "============================================================"
Write-Host ""
Write-ColorOutput Green "🚀 Happy coding!"
Write-Host ""

# Wait a bit then open browser
Start-Sleep -Seconds 5
Write-ColorOutput Cyan "Opening browser..."
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Process IDs for reference:" -ForegroundColor Gray
Write-Host "  Stripe CLI: $($stripe.Id)" -ForegroundColor Gray
Write-Host "  API Server: $($api.Id)" -ForegroundColor Gray
Write-Host "  Frontend:   $($frontend.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "This window will remain open. You can minimize it." -ForegroundColor Gray
Write-Host "Press Ctrl+C to exit (won't stop the services)." -ForegroundColor Gray

# Keep the script running
while ($true) {
    Start-Sleep -Seconds 60
} 