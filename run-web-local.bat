@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules" (
  echo [ERROR] node_modules not found.
  echo Run: corepack pnpm install
  pause
  exit /b 1
)

echo Starting CIP Web on http://localhost:5173
call corepack pnpm dev:web

if errorlevel 1 (
  echo.
  echo Web stopped with an error.
  pause
)

endlocal
