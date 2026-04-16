@echo off
setlocal

cd /d "%~dp0"
set "PNPM_CMD="

if "%~1"=="" (
  echo Usage: match-kbiz-statement-local.bat ^<path-to-statement^>
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
exit /b 1

:pnpm_found
call "%PNPM_CMD%" --filter @cip/api match:kbiz --file "%~1"
