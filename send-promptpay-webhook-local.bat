@echo off
setlocal

if "%~1"=="" (
  echo Usage: send-promptpay-webhook-local.bat ^<payment-intent-id^>
  exit /b 1
)

corepack pnpm --filter @cip/api webhook:promptpay --payment-intent-id %1
