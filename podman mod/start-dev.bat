@echo off
echo Starting Sticker Shuttle Development Environment with Podman...
echo.
echo Starting API Server (localhost:4000) and Frontend (localhost:3000)...
echo.
echo Press Ctrl+C to stop both servers
echo.
podman compose -f podman-compose.dev.yml up --build
pause 