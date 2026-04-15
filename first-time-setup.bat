@echo off
setlocal

cd /d "%~dp0"
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "PNPM_JS=%ProgramFiles%\nodejs\node_modules\corepack\dist\pnpm.js"

if not exist "%NODE_EXE%" (
  echo [ERROR] node.exe not found at "%NODE_EXE%"
  pause
  exit /b 1
)

if not exist "%PNPM_JS%" (
  echo [ERROR] pnpm.js not found at "%PNPM_JS%"
  echo Please reinstall Node.js with Corepack support.
  pause
  exit /b 1
)

echo CIP first-time local setup
echo.

echo [1/5] Installing dependencies...
call "%NODE_EXE%" "%PNPM_JS%" install
if errorlevel 1 goto :fail

echo.
echo [2/5] Creating .env.local if needed...
call "%NODE_EXE%" "%PNPM_JS%" setup:local
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
echo [3/5] Pushing database schema...
call "%NODE_EXE%" "%PNPM_JS%" db:push
if errorlevel 1 goto :dbfail

echo.
echo [4/5] Seeding demo data...
call "%NODE_EXE%" "%PNPM_JS%" db:seed
if errorlevel 1 goto :dbfail

echo.
echo [5/5] Setup complete.
echo You can now run:
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
