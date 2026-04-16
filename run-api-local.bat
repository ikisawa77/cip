@echo off
setlocal

cd /d "%~dp0"
set "PNPM_CMD="

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\doctor-local.ps1" -Mode run
if errorlevel 1 (
  pause
  exit /b 1
)

for /f "delims=" %%I in ('where pnpm.cmd 2^>nul') do (
  set "PNPM_CMD=%%I"
  goto :pnpm_found
)
for /f "delims=" %%I in ('where pnpm 2^>nul') do (
  set "PNPM_CMD=%%I"
  goto :pnpm_found
)

echo [ERROR] pnpm was not found in PATH.
echo Run: npm install -g pnpm@10.33.0
pause
exit /b 1

:pnpm_found

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
