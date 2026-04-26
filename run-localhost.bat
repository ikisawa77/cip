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

if not exist ".env.local" if not exist ".env" (
  echo [WARN] .env.local was not found.
  echo API will use fallback development values until you create it.
  echo.
)

echo Ensuring MariaDB local database is ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-mariadb-local.ps1"
if errorlevel 1 (
  echo [ERROR] MariaDB local is not ready.
  pause
  exit /b 1
)

echo Ensuring local demo data is ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-local-demo-data.ps1"
if errorlevel 1 (
  echo [ERROR] Local demo data could not be prepared.
  pause
  exit /b 1
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
