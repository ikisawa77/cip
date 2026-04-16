@echo off
setlocal
if "%~1"=="" (
  echo Usage: match-promptpay-transactions-local.bat ^<path-to-json^>
  exit /b 1
)
corepack pnpm --filter @cip/api match:promptpay --file "%~1"
