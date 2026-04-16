@echo off
setlocal

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\doctor-local.ps1" %*
if errorlevel 1 (
  echo.
  echo Local doctor พบปัญหาที่ต้องแก้ก่อนทำงานต่อ
  pause
  exit /b 1
)

endlocal
