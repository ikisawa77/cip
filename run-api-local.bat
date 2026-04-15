@echo off
setlocal

cd /d "%~dp0"
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "PNPM_JS=%ProgramFiles%\nodejs\node_modules\corepack\dist\pnpm.js"

if not exist "%NODE_EXE%" (
  echo [ERROR] node.exe not found at "%NODE_EXE%"
  pause
  exit /b 1
)

if not exist "%PNPM_JS%" (
  echo [ERROR] pnpm.js not found at "%PNPM_JS%"
  echo Please reinstall Node.js with Corepack support.
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
call "%NODE_EXE%" "%PNPM_JS%" dev:api

if errorlevel 1 (
  echo.
  echo API stopped with an error.
  pause
)

endlocal
