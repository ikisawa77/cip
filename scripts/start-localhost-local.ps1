$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logsDir = Join-Path $repoRoot "logs"
$voltaBin = "C:\Program Files\Volta"

Set-Location $repoRoot
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

if (Test-Path $voltaBin) {
  $env:Path = "$voltaBin;$env:Path"
}

function Resolve-Pnpm {
  if (Test-Path (Join-Path $voltaBin "pnpm.cmd")) {
    return (Join-Path $voltaBin "pnpm.cmd")
  }

  $command = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $command = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "pnpm was not found. Run first-time-setup.bat first."
}

function Stop-OldLocalhost {
  & (Join-Path $PSScriptRoot "stop-localhost-local.ps1")
}

function Invoke-Logged {
  param(
    [string]$Label,
    [string[]]$Arguments,
    [string]$LogName
  )

  $stdout = Join-Path $logsDir "$LogName.log"
  $stderr = Join-Path $logsDir "$LogName.err"
  Remove-Item $stdout, $stderr -ErrorAction SilentlyContinue

  Write-Host $Label
  $process = Start-Process -FilePath $script:pnpmPath `
    -ArgumentList $Arguments `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden `
    -Wait `
    -PassThru

  if ($process.ExitCode -ne 0) {
    Write-Host "[ERROR] $Label failed. See:"
    Write-Host "- $stdout"
    Write-Host "- $stderr"
    throw "$Label failed"
  }
}

function Start-LoggedServer {
  param(
    [string]$Label,
    [string[]]$Arguments,
    [string]$LogName
  )

  $stdout = Join-Path $logsDir "$LogName.log"
  $stderr = Join-Path $logsDir "$LogName.err"
  Remove-Item $stdout, $stderr -ErrorAction SilentlyContinue

  Write-Host $Label
  return Start-Process -FilePath $script:pnpmPath `
    -ArgumentList $Arguments `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden `
    -PassThru
}

function Wait-Http {
  param(
    [string]$Url,
    [int]$TimeoutSeconds,
    [string]$Name
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Host "[ OK ] $Name is ready: $Url"
        return
      }
    } catch {
    }

    Start-Sleep -Milliseconds 500
  }

  throw "$Name did not become ready: $Url"
}

$script:pnpmPath = Resolve-Pnpm

Write-Host "Cleaning old localhost processes..."
Stop-OldLocalhost

Write-Host ""
& (Join-Path $PSScriptRoot "doctor-local.ps1") -Mode run

Write-Host ""
Write-Host "Ensuring MariaDB local database is ready..."
& (Join-Path $PSScriptRoot "ensure-mariadb-local.ps1")

Write-Host "Ensuring local demo data is ready..."
& (Join-Path $PSScriptRoot "ensure-local-demo-data.ps1")

Write-Host ""
Invoke-Logged "Building CIP API..." @("--filter", "@cip/api", "build") "api-build"
Invoke-Logged "Building CIP Web..." @("--filter", "@cip/web", "build") "web-build"

Write-Host ""
$apiProcess = Start-LoggedServer "Starting API in background..." @("--filter", "@cip/api", "start") "api"
$webProcess = Start-LoggedServer "Starting Web in background..." @("serve:web:local") "web"

Wait-Http "http://127.0.0.1:3001/api/health" 45 "API"
Wait-Http "http://127.0.0.1:5173" 45 "WEB"

Write-Host ""
Write-Host "CIP localhost is ready."
Write-Host "WEB: http://localhost:5173"
Write-Host "API: http://localhost:3001/api/health"
Write-Host "API PID: $($apiProcess.Id)"
Write-Host "WEB PID: $($webProcess.Id)"
Write-Host "Logs: $logsDir"
