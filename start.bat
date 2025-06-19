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

:: Start Stripe CLI in a new window
echo [STRIPE] Starting Stripe CLI webhook forwarding...
start "Stripe CLI" cmd /k "echo STRIPE CLI - Webhook Forwarding to localhost:4000 && echo ============================================ && echo. && stripe listen --forward-to localhost:4000/webhooks/stripe || echo. && echo ERROR: Stripe CLI not installed or not in PATH && echo Install from: https://stripe.com/docs/stripe-cli && pause"

:: Wait a bit for Stripe to start
timeout /t 3 /nobreak > nul

:: Start API server in a new window
echo [API] Starting API server on port 4000...
start "API Server" cmd /k "cd api && echo API SERVER - Running on http://localhost:4000 && echo ============================================ && echo. && npm run dev || echo. && echo ERROR: Failed to start API server && echo Run 'npm install' in the api directory && pause"

:: Wait a bit for API to start
timeout /t 3 /nobreak > null

:: Start Frontend in a new window
echo [FRONTEND] Starting Next.js frontend on port 3000...
start "Frontend Server" cmd /k "cd frontend && echo FRONTEND SERVER - Running on http://localhost:3000 && echo ============================================ && echo. && npm run dev || echo. && echo ERROR: Failed to start frontend && echo Run 'npm install' in the frontend directory && pause"

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