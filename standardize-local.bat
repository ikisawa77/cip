@echo off
setlocal

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\standardize-local.ps1" %*
if errorlevel 1 (
  echo.
  echo Machine standardization did not complete successfully.
  pause
  exit /b 1
)

endlocal
