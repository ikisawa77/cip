$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env.local"
$examplePath = Join-Path $root ".env.example"

if (-not (Test-Path $envPath)) {
  if (-not (Test-Path $examplePath)) {
    throw ".env.example not found at $examplePath"
  }

  Copy-Item $examplePath $envPath -ErrorAction Stop
  Write-Host ".env.local created from .env.example"
} else {
  Write-Host ".env.local already exists"
}

$mysqlCommand = Get-Command mysql -ErrorAction SilentlyContinue

if ($mysqlCommand) {
  Write-Host "mysql command found"
  Write-Host 'Run this if you want to create the default database:'
  Write-Host 'mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cip_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"'
} else {
  Write-Host "mysql command not found in PATH"
  Write-Host "first-time-setup.bat and run-localhost.bat can still start local MariaDB automatically if MariaDB Server is installed."
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Review DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in .env.local"
Write-Host "2. Run first-time-setup.bat"
Write-Host "3. Run run-localhost.bat"
