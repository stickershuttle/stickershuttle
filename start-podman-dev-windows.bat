@echo off
echo Starting Sticker Shuttle Development with Podman...
echo.

rem Add Podman to PATH for this session
set "PATH=C:\Program Files\RedHat\Podman;%PATH%"

rem Disable external Docker Compose provider
set "PODMAN_COMPOSE_PROVIDER="

rem Test if Podman is working
podman --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Podman not found. Please run: .\quick-podman-setup.bat
    pause
    exit /b 1
)

rem Check if Podman machine is running
podman machine list | findstr "Currently running" >nul
if %errorlevel% neq 0 (
    echo Starting Podman machine...
    podman machine start
    if %errorlevel% neq 0 (
        echo ❌ Failed to start Podman machine
        pause
        exit /b 1
    )
)

echo ✅ Podman is ready!
echo.
echo Starting development environment...
echo API: http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop all containers
echo.

rem Use native Podman compose (not docker-compose)
podman compose -f podman-compose.dev.yml up --build

echo.
echo Development environment stopped.
pause 