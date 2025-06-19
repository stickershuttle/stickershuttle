@echo off
title Stop Sticker Shuttle Development Environment

echo.
echo ============================================================
echo        STOPPING STICKER SHUTTLE DEVELOPMENT SERVICES
echo ============================================================
echo.

echo Stopping all Node.js processes and Stripe CLI...
echo.

:: Kill Node.js processes (API and Frontend)
echo [1] Stopping Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel%==0 (
    echo    - Node.js processes stopped successfully
) else (
    echo    - No Node.js processes were running
)

:: Kill Stripe CLI
echo [2] Stopping Stripe CLI...
taskkill /F /IM stripe.exe 2>nul
if %errorlevel%==0 (
    echo    - Stripe CLI stopped successfully
) else (
    echo    - Stripe CLI was not running
)

:: Kill any remaining processes on our ports
echo [3] Cleaning up ports 3000 and 5000...
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
echo    - Ports cleaned up

echo.
echo ============================================================
echo.
echo All development services have been stopped.
echo.
echo You can now safely run start-local-dev.bat again.
echo.
echo ============================================================
echo.
pause 