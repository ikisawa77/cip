@echo off
setlocal

cd /d "%~dp0"
set "PNPM_CMD=%APPDATA%\npm\pnpm.cmd"

if not exist "%PNPM_CMD%" (
  echo [ERROR] pnpm.cmd not found at "%PNPM_CMD%"
  echo Run: npm install -g pnpm@10.33.0
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [ERROR] node_modules not found.
  echo Run: first-time-setup.bat
  pause
  exit /b 1
)

if not exist ".env.local" if not exist ".env" (
  echo [WARN] .env.local was not found.
  echo API will use fallback development values until you create it.
  echo.
)

echo Ensuring MariaDB local database is ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-mariadb-local.ps1"
if errorlevel 1 (
  echo [ERROR] MariaDB local is not ready.
  pause
  exit /b 1
)

echo Ensuring local demo data is ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-local-demo-data.ps1"
if errorlevel 1 (
  echo [ERROR] Local demo data could not be prepared.
  pause
  exit /b 1
)

echo Opening API and Web dev servers...
start "CIP API" cmd /k call "%~dp0run-api-local.bat"
start "CIP WEB" cmd /k call "%~dp0run-web-local.bat"

echo.
echo API: http://localhost:3001
echo WEB: http://localhost:5173
echo.
echo Close the opened terminal windows to stop the servers.
pause

endlocal
