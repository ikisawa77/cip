@echo off
setlocal

cd /d "%~dp0"

echo Ensuring MariaDB local database is ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-mariadb-local.ps1"

if errorlevel 1 (
  echo.
  echo [ERROR] Could not prepare MariaDB for localhost.
  pause
  exit /b 1
)

echo.
echo MariaDB local is ready.
pause

endlocal
