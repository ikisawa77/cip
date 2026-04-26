@echo off
setlocal

cd /d "%~dp0"

echo Starting CIP localhost clean mode...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-localhost-local.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Localhost could not start. Check logs in "%~dp0logs".
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\clear-terminal-noise-local.ps1" >nul 2>nul

echo.
echo Localhost is running in the background.
echo Open: http://localhost:5173
echo Stop: stop-localhost.bat
pause

endlocal
