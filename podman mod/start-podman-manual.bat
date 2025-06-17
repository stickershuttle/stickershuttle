@echo off
echo Starting Sticker Shuttle with Podman (Manual Method)...
echo.

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
echo Cleaning up existing containers...
podman stop sticker-api sticker-frontend 2>nul
podman rm sticker-api sticker-frontend 2>nul

rem Create a network for the services
echo Creating network...
podman network create sticker-network 2>nul

echo Building API container...
podman build -t sticker-api -f api/Containerfile api/
if %errorlevel% neq 0 (
    echo ❌ Failed to build API container
    pause
    exit /b 1
)

echo Building Frontend container...
podman build -t sticker-frontend -f frontend/Containerfile frontend/
if %errorlevel% neq 0 (
    echo ❌ Failed to build Frontend container
    pause
    exit /b 1
)

echo.
echo Starting API container...
podman run -d --name sticker-api --network sticker-network -p 4000:4000 -v "%cd%\api:/app" -v "%cd%\.env.local:/app/.env.local" sticker-api npm run dev

echo Starting Frontend container...
podman run -d --name sticker-frontend --network sticker-network -p 3000:3000 -v "%cd%\frontend:/app" -v "%cd%\.env.local:/app/.env.local" -e NEXT_PUBLIC_API_URL=http://sticker-api:4000 sticker-frontend npm run dev

echo.
echo ✅ Development environment started!
echo.
echo 🌐 Services:
echo   Frontend: http://localhost:3000
echo   API: http://localhost:4000
echo   GraphQL: http://localhost:4000/graphql
echo.
echo 📊 Container Status:
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo 💡 To stop: npm run podman:stop (or podman stop sticker-api sticker-frontend)
echo 📱 Check Podman Desktop to see your running containers!
echo.
pause 