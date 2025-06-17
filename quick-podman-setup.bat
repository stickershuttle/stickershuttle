@echo off
echo Quick Podman Setup for Windows
echo ================================

rem Check if podman is already in PATH
podman --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Podman is already working!
    podman --version
    goto :start_machine
)

echo Podman not found in PATH. Trying to add it...

rem Try most common installation path
set "PODMAN_EXE=C:\Program Files\RedHat\Podman\podman.exe"
if exist "%PODMAN_EXE%" (
    echo ✅ Found Podman at: %PODMAN_EXE%
    set "PATH=C:\Program Files\RedHat\Podman;%PATH%"
    goto :test_podman
)

rem Try alternative path
set "PODMAN_EXE=%LOCALAPPDATA%\RedHat\Podman\podman.exe"
if exist "%PODMAN_EXE%" (
    echo ✅ Found Podman at: %PODMAN_EXE%
    set "PATH=%LOCALAPPDATA%\RedHat\Podman;%PATH%"
    goto :test_podman
)

echo ❌ Podman not found. Please install Podman Desktop from:
echo https://podman-desktop.io/downloads
pause
exit /b 1

:test_podman
echo Testing Podman...
podman --version
if %errorlevel% neq 0 (
    echo ❌ Podman still not working
    pause
    exit /b 1
)

:start_machine
echo.
echo Starting Podman machine...
podman machine list
podman machine start >nul 2>&1
if %errorlevel% neq 0 (
    echo Initializing new Podman machine...
    podman machine init --cpus 2 --memory 2048
    podman machine start
)

echo.
echo ✅ Podman is ready!
echo You can now run: npm run podman:dev
echo. 