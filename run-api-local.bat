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

echo Starting CIP API on http://localhost:3001
call "%PNPM_CMD%" dev:api

if errorlevel 1 (
  echo.
  echo API stopped with an error.
  pause
)

endlocal
