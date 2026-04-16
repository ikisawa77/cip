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

echo Ensuring MariaDB local database is ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-mariadb-local.ps1"
if errorlevel 1 (
  echo.
  echo API could not start because MariaDB local is not ready.
  pause
  exit /b 1
)

echo Ensuring local demo data is ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-local-demo-data.ps1"
if errorlevel 1 (
  echo.
  echo API could not start because local demo data could not be prepared.
  pause
  exit /b 1
)

echo Starting CIP API on http://localhost:3001
call "%PNPM_CMD%" dev:api

if errorlevel 1 (
  echo.
  echo API stopped with an error.
  pause
)

endlocal
