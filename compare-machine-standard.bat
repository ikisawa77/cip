@echo off
setlocal

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\compare-machine-standard.ps1" %*
if errorlevel 1 (
  echo.
  echo Machine comparison found differences or could not complete.
  pause
  exit /b 1
)

endlocal
