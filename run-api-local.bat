@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules" (
  echo [ERROR] node_modules not found.
  echo Run: corepack pnpm install
  pause
  exit /b 1
)

echo Starting CIP API on http://localhost:3001
call corepack pnpm dev:api

if errorlevel 1 (
  echo.
  echo API stopped with an error.
  pause
)

endlocal
