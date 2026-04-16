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

echo Starting CIP Web on http://localhost:5173
call "%PNPM_CMD%" dev:web -- --host 127.0.0.1

if errorlevel 1 (
  echo.
  echo Web stopped with an error.
  pause
)

endlocal
