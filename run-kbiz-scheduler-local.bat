@echo off
setlocal

cd /d "%~dp0"
set "VOLTA_BIN=C:\Program Files\Volta"
set "PNPM_CMD=pnpm"

if not exist "%VOLTA_BIN%\pnpm.cmd" goto check_path_pnpm
set "PNPM_CMD=%VOLTA_BIN%\pnpm.cmd"
goto pnpm_checked

:check_path_pnpm
where pnpm >nul 2>nul

:pnpm_checked
if errorlevel 1 (
  echo [ERROR] pnpm not found in PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [ERROR] node_modules not found.
  echo Run: first-time-setup.bat
  pause
  exit /b 1
)

if "%KBIZ_SYNC_INTERVAL_MS%"=="" (
  set "KBIZ_SYNC_INTERVAL_MS=300000"
)

echo Starting K-Biz scheduler with interval %KBIZ_SYNC_INTERVAL_MS% ms...
call "%PNPM_CMD%" --filter @cip/api schedule:kbiz

endlocal
