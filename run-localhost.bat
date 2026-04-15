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

if not exist ".env.local" if not exist ".env" (
  echo [WARN] .env.local was not found.
  echo API will use fallback development values until you create it.
  echo.
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
