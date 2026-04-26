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

echo Building CIP Web for stable local start...
call "%PNPM_CMD%" --filter @cip/web build
if errorlevel 1 (
  echo.
  echo Web build failed.
  pause
  exit /b 1
)

echo Starting CIP Web on http://localhost:5173
call "%PNPM_CMD%" serve:web:local

if errorlevel 1 (
  echo.
  echo Web stopped with an error.
  pause
)

endlocal
