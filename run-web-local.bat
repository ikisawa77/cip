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

echo Starting CIP Web on http://localhost:5173
call "%PNPM_CMD%" dev:web -- --host 127.0.0.1

if errorlevel 1 (
  echo.
  echo Web stopped with an error.
  pause
)

endlocal
