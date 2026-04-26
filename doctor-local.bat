@echo off
setlocal

cd /d "%~dp0"
if not exist "C:\Program Files\Volta\node.exe" goto doctor_without_volta
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:Path='C:\Program Files\Volta;'+$env:Path; & '%~dp0scripts\doctor-local.ps1' %*"
goto doctor_done

:doctor_without_volta
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\doctor-local.ps1" %*

:doctor_done
if errorlevel 1 (
  echo.
  echo Local doctor พบปัญหาที่ต้องแก้ก่อนทำงานต่อ
  pause
  exit /b 1
)

endlocal
