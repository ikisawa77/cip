@echo off
setlocal

cd /d "%~dp0"
set "VOLTA_BIN=C:\Program Files\Volta"
set "PNPM_CMD="

if not exist "%VOLTA_BIN%\node.exe" goto doctor_without_volta
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:Path='%VOLTA_BIN%;'+$env:Path; & '%~dp0scripts\doctor-local.ps1' -Mode run"
goto doctor_done

:doctor_without_volta
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\doctor-local.ps1" -Mode run

:doctor_done
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist "%VOLTA_BIN%\pnpm.cmd" goto find_pnpm
set "PNPM_CMD=%VOLTA_BIN%\pnpm.cmd"
goto :pnpm_found

:find_pnpm
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
