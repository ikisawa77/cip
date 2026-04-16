@echo off
setlocal

cd /d "%~dp0"
set "PNPM_CMD="

echo CIP first-time local setup
echo.

echo [0/6] Running local doctor...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\doctor-local.ps1" -Mode setup
if errorlevel 1 goto :fail

for /f "delims=" %%I in ('where pnpm.cmd 2^>nul') do (
  set "PNPM_CMD=%%I"
  goto :pnpm_found
)
for /f "delims=" %%I in ('where pnpm 2^>nul') do (
  set "PNPM_CMD=%%I"
  goto :pnpm_found
)

echo [ERROR] pnpm was not found in PATH.
echo Run this once in PowerShell:
echo npm install -g pnpm@10.33.0
pause
exit /b 1

:pnpm_found

echo [1/6] Installing dependencies...
call "%PNPM_CMD%" install
if errorlevel 1 goto :fail

echo.
echo [2/6] Creating .env.local if needed...
call "%PNPM_CMD%" setup:local
if errorlevel 1 goto :fail

if not exist ".env.local" (
  echo.
  echo [ERROR] .env.local was not created in "%cd%"
  echo Please check scripts\setup-local.ps1 and try again.
  pause
  goto :eof
)

echo.
echo Review and update .env.local before continuing.
start "" notepad.exe "%cd%\.env.local"

echo.
echo Required values:
echo - DB_HOST
echo - DB_PORT
echo - DB_USER
echo - DB_PASSWORD
echo - DB_NAME
echo.
pause

echo.
echo [3/6] Ensuring local MariaDB is ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-mariadb-local.ps1"
if errorlevel 1 goto :dbfail

echo.
echo [4/6] Pushing database schema...
call "%PNPM_CMD%" db:push
if errorlevel 1 goto :dbfail

echo.
echo [5/6] Seeding demo data...
call "%PNPM_CMD%" db:seed
if errorlevel 1 goto :dbfail

echo.
echo [6/6] Setup complete.
echo You can now run:
- start-db-local.bat
echo - run-localhost.bat
echo - or double-click run-api-local.bat / run-web-local.bat
echo.
pause
goto :eof

:dbfail
echo.
echo Database step failed.
echo Check MariaDB is running and verify .env.local credentials.
pause
goto :eof

:fail
echo.
echo Setup stopped because a command failed.
pause
goto :eof

endlocal
