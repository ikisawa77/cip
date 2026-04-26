@echo off
setlocal

cd /d "%~dp0"

echo Stopping CIP localhost servers...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-localhost-local.ps1"

echo.
echo Done.
pause

endlocal
