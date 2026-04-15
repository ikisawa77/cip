@echo off
setlocal

cd /d "%~dp0"

echo CIP first-time local setup
echo.

echo [1/5] Installing dependencies...
call corepack pnpm install
if errorlevel 1 goto :fail

echo.
echo [2/5] Creating .env.local if needed...
call corepack pnpm setup:local
if errorlevel 1 goto :fail

echo.
echo Review and update .env.local before continuing.
if exist ".env.local" (
  start "" notepad ".env.local"
) else (
  echo [WARN] .env.local was not created. Check setup-local output above.
)

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
call corepack pnpm db:push
if errorlevel 1 goto :dbfail

echo.
echo [4/5] Seeding demo data...
call corepack pnpm db:seed
if errorlevel 1 goto :dbfail

echo.
echo [5/5] Setup complete.
echo You can now run:
echo - run-localhost.bat
echo - or double-click run-api-local.bat / run-web-local.bat
echo.
pause
exit /b 0

:dbfail
echo.
echo Database step failed.
echo Check MariaDB is running and verify .env.local credentials.
pause
exit /b 1

:fail
echo.
echo Setup stopped because a command failed.
pause
exit /b 1

endlocal
