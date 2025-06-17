@echo off
echo Setting up Podman for Windows...
echo.

echo Checking if Podman is in PATH...
where podman >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Podman found in PATH
    podman --version
) else (
    echo ❌ Podman not found in PATH
    echo.
    echo Trying common Podman installation paths...
    
    if exist "C:\Program Files\RedHat\Podman\podman.exe" (
        echo ✅ Found Podman at: C:\Program Files\RedHat\Podman\podman.exe
        set "PODMAN_PATH=C:\Program Files\RedHat\Podman"
        goto :found_podman
    )
    if exist "%LOCALAPPDATA%\RedHat\Podman\podman.exe" (
        echo ✅ Found Podman at: %LOCALAPPDATA%\RedHat\Podman\podman.exe
        set "PODMAN_PATH=%LOCALAPPDATA%\RedHat\Podman"
        goto :found_podman
    )
    if exist "C:\Program Files (x86)\RedHat\Podman\podman.exe" (
        echo ✅ Found Podman at: C:\Program Files (x86)\RedHat\Podman\podman.exe
        set "PODMAN_PATH=C:\Program Files (x86)\RedHat\Podman"
        goto :found_podman
    )
    
    rem Not found in standard locations
    echo ❌ Podman executable not found in standard locations
    echo Please reinstall Podman Desktop from: https://podman-desktop.io/downloads
    pause
    exit /b 1

:found_podman
    echo.
    echo Adding Podman to PATH for this session...
    set "PATH=%PODMAN_PATH%;%PATH%"
    
    echo Testing Podman...
    podman --version
    if %errorlevel% == 0 (
        echo ✅ Podman is now working!
        echo.
        echo To permanently add to PATH, run this command as Administrator:
        echo setx PATH "%%PATH%%;%PODMAN_PATH%" /M
    ) else (
        echo ❌ Still having issues with Podman
        pause
        exit /b 1
    )
)

echo.
echo Initializing Podman machine (if needed)...
podman machine list
podman machine init --cpus 2 --memory 2048 --disk-size 20 2>nul
echo.
echo Starting Podman machine...
podman machine start

echo.
echo ✅ Podman setup complete!
echo You can now use: npm run podman:dev
pause 