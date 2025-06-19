@echo off
title Sticker Shuttle Local Development Environment

echo.
echo ============================================================
echo           STICKER SHUTTLE DEVELOPMENT ENVIRONMENT
echo ============================================================
echo.
echo Starting all services...
echo.
echo [1] Stripe CLI Webhook Forwarding (Port 4000)
echo [2] API Server (Port 4000)  
echo [3] Frontend Server (Port 3000)
echo.
echo ============================================================
echo.

:: Check if required directories exist
if not exist "api" (
    echo ERROR: API directory not found!
    echo Please ensure you're running this from the project root.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: Frontend directory not found!
    echo Please ensure you're running this from the project root.
    pause
    exit /b 1
)

:: Kill any existing processes on our ports
echo Cleaning up any existing processes...
echo.
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
powershell -Command "Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak > nul

:: Check if Windows Terminal is available
where wt >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Windows Terminal not found. Falling back to separate windows...
    :: Fallback to original behavior
    start "Stripe CLI" cmd /k "echo STRIPE CLI - Webhook Forwarding to localhost:4000 && echo ============================================ && echo. && stripe listen --forward-to localhost:4000/webhooks/stripe || echo. && echo ERROR: Stripe CLI not installed or not in PATH && echo Install from: https://stripe.com/docs/stripe-cli && pause"
timeout /t 3 /nobreak > nul
start "API Server" cmd /k "cd api && echo API SERVER - Running on http://localhost:4000 && echo ============================================ && echo. && npm run dev || echo. && echo ERROR: Failed to start API server && echo Run 'npm install' in the api directory && pause"
timeout /t 3 /nobreak > nul
start "Frontend Server" cmd /k "cd frontend && echo FRONTEND SERVER - Running on http://localhost:3000 && echo ============================================ && echo. && npm run dev || echo. && echo ERROR: Failed to start frontend && echo Run 'npm install' in the frontend directory && pause"
) else (
    echo Starting services in Windows Terminal with PowerShell tabs...
    :: Start Windows Terminal with multiple tabs
    wt ^
    new-tab --title "Stripe CLI" PowerShell -NoExit -Command "Write-Host 'STRIPE CLI - Webhook Forwarding to localhost:4000' -ForegroundColor Green; Write-Host '============================================' -ForegroundColor Green; Write-Host ''; stripe listen --forward-to localhost:4000/webhooks/stripe; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'ERROR: Stripe CLI not installed or not in PATH' -ForegroundColor Red; Write-Host 'Install from: https://stripe.com/docs/stripe-cli' -ForegroundColor Yellow; Read-Host 'Press Enter to exit' }" ; ^
    new-tab --title "API Server" PowerShell -NoExit -Command "cd api; Write-Host 'API SERVER - Running on http://localhost:4000' -ForegroundColor Blue; Write-Host '============================================' -ForegroundColor Blue; Write-Host ''; npm run dev; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'ERROR: Failed to start API server' -ForegroundColor Red; Write-Host 'Run ''npm install'' in the api directory' -ForegroundColor Yellow; Read-Host 'Press Enter to exit' }" ; ^
    new-tab --title "Frontend" PowerShell -NoExit -Command "cd frontend; Write-Host 'FRONTEND SERVER - Running on http://localhost:3000' -ForegroundColor Cyan; Write-Host '============================================' -ForegroundColor Cyan; Write-Host ''; npm run dev; if ($LASTEXITCODE -ne 0) { Write-Host ''; Write-Host 'ERROR: Failed to start frontend' -ForegroundColor Red; Write-Host 'Run ''npm install'' in the frontend directory' -ForegroundColor Yellow; Read-Host 'Press Enter to exit' }"
)

echo.
echo ============================================================
echo.
echo All services are starting up!
echo.
echo Frontend:  http://localhost:3000
echo API:       http://localhost:4000
echo GraphQL:   http://localhost:4000/graphql
echo.
echo Stripe webhooks are being forwarded to your local API.
echo.
echo To stop all services, close each window or press Ctrl+C.
echo.
echo ============================================================
echo.
echo Happy coding! 🚀
echo.
timeout /t 5 /nobreak > nul

:: Open the browser after a short delay
echo Opening browser...
start http://localhost:3000

:: Keep this window open to show the status
echo.
echo This window shows the startup status.
echo You can close it now - all services are running in separate windows.
echo.
pause 