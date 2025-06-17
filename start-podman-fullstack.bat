@echo off
echo Starting Full-Stack Sticker Shuttle with Podman...
echo ====================================================

rem Add Podman to PATH for this session
set "PATH=C:\Program Files\RedHat\Podman;%PATH%"

rem Test if Podman is working
podman --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Podman not found. Please run: .\quick-podman-setup.bat
    pause
    exit /b 1
)

echo ✅ Podman is ready!
echo.

rem Clean up any existing containers
echo 🧹 Cleaning up existing containers...
podman stop sticker-api sticker-frontend 2>nul
podman rm sticker-api sticker-frontend 2>nul

rem Create a network for the services
echo 🌐 Creating network...
podman network create sticker-network 2>nul

echo 🔨 Building containers...
echo.

rem Build API container
echo Building API container...
podman build -t sticker-api -f api/Containerfile api/
if %errorlevel% neq 0 (
    echo ❌ Failed to build API container
    pause
    exit /b 1
)

rem Build Frontend container
echo Building Frontend container...
podman build -t sticker-frontend -f frontend/Containerfile frontend/
if %errorlevel% neq 0 (
    echo ❌ Failed to build Frontend container
    pause
    exit /b 1
)

echo.
echo 🚀 Starting containers...

rem Start API container
echo Starting API container...
podman run -d --name sticker-api --network sticker-network -p 4000:4000 -v "%cd%\.env.local:/app/.env.local:Z" sticker-api

rem Start Frontend container
echo Starting Frontend container...
podman run -d --name sticker-frontend --network sticker-network -p 3000:3000 -v "%cd%\frontend:/app:Z" -v "%cd%\.env.local:/app/.env.local:Z" -e NEXT_PUBLIC_API_URL=http://sticker-api:4000 -e WATCHPACK_POLLING=true -e CHOKIDAR_USEPOLLING=true sticker-frontend

echo.
echo ✅ Full-Stack Development Environment Started!
echo.
echo 🌐 Services:
echo   Frontend: http://localhost:3000
echo   API: http://localhost:4000
echo   GraphQL: http://localhost:4000/graphql
echo.
echo 📊 Container Status:
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo 💡 To stop: podman stop sticker-api sticker-frontend
echo 💡 To view logs: podman logs [container-name]
echo 📱 Check Podman Desktop to see your running containers!
echo.
echo Press any key to view live logs (Ctrl+C to stop)...
pause >nul

echo.
echo 📊 Live container logs (Ctrl+C to stop):
echo ===============================================
podman logs -f sticker-api sticker-frontend 