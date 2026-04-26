$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env.local"
$fallbackEnvPath = Join-Path $root ".env"

function Get-EnvMap {
  param(
    [string[]]$Paths
  )

  $map = @{}

  foreach ($path in $Paths) {
    if (-not (Test-Path $path)) {
      continue
    }

    foreach ($line in Get-Content $path) {
      if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#")) {
        continue
      }

      $parts = $line -split "=", 2
      if ($parts.Length -ne 2) {
        continue
      }

      $map[$parts[0].Trim()] = $parts[1]
    }
  }

  return $map
}

function Get-MariaDbRoot {
  $candidateRoots = @(
    "C:\xampp\mysql",
    "C:\AppServ\MySQL",
    "C:\Program Files\MariaDB 12.2",
    "C:\Program Files\MariaDB 11.8",
    "C:\Program Files\MariaDB 11.7",
    "C:\Program Files\MariaDB 11.6",
    "C:\Program Files\MariaDB 11.5",
    "C:\Program Files\MariaDB 11.4",
    "C:\Program Files\MariaDB 11.3",
    "C:\Program Files\MariaDB 11.2",
    "C:\Program Files\MariaDB 11.1",
    "C:\Program Files\MariaDB 11.0",
    "C:\Program Files\MariaDB 10.11",
    "C:\Program Files\MariaDB 10.6"
  )

  foreach ($candidate in $candidateRoots) {
    if ((Test-Path (Join-Path $candidate "bin\mariadbd.exe")) -or (Test-Path (Join-Path $candidate "bin\mysqld.exe"))) {
      return $candidate
    }
  }

  $discovered = Get-ChildItem "C:\Program Files" -Directory -Filter "MariaDB*" -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    Select-Object -First 1

  if ($discovered -and ((Test-Path (Join-Path $discovered.FullName "bin\mariadbd.exe")) -or (Test-Path (Join-Path $discovered.FullName "bin\mysqld.exe")))) {
    return $discovered.FullName
  }

  throw "MariaDB/MySQL Server not found. Install MariaDB or XAMPP first."
}

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Get-OrDefault {
  param(
    [hashtable]$Map,
    [string]$Key,
    [string]$DefaultValue
  )

  if ($Map.ContainsKey($Key)) {
    return $Map[$Key]
  }

  return $DefaultValue
}

$envMap = Get-EnvMap -Paths @($envPath, $fallbackEnvPath)
$dbPort = [int](Get-OrDefault -Map $envMap -Key "DB_PORT" -DefaultValue "3306")
$dbUser = Get-OrDefault -Map $envMap -Key "DB_USER" -DefaultValue "root"
$dbPassword = Get-OrDefault -Map $envMap -Key "DB_PASSWORD" -DefaultValue ""
$dbName = Get-OrDefault -Map $envMap -Key "DB_NAME" -DefaultValue "cip_local"

$mariaDbRoot = Get-MariaDbRoot
$mariaDbExe = Join-Path $mariaDbRoot "bin\mariadbd.exe"
if (-not (Test-Path $mariaDbExe)) {
  $mariaDbExe = Join-Path $mariaDbRoot "bin\mysqld.exe"
}
$mysqlExe = Join-Path $mariaDbRoot "bin\mysql.exe"
$defaultsFile = Join-Path $mariaDbRoot "data\my.ini"
if (-not (Test-Path $defaultsFile)) {
  $defaultsFile = Join-Path $mariaDbRoot "bin\my.ini"
}
$stdoutLog = Join-Path $root "mariadb-local.out.log"
$stderrLog = Join-Path $root "mariadb-local.err.log"

if (-not (Test-Path $defaultsFile)) {
  throw "MariaDB defaults file not found at $defaultsFile"
}

$listening = Get-NetTCPConnection -LocalPort $dbPort -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Write-Host "Starting MariaDB on port $dbPort..."
  Start-Process -FilePath $mariaDbExe `
    -ArgumentList @("--defaults-file=`"$defaultsFile`"", "--console") `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden

  if (-not (Wait-ForPort -Port $dbPort -TimeoutSeconds 25)) {
    throw "MariaDB did not start on port $dbPort. Check $stderrLog"
  }
} else {
  Write-Host "MariaDB is already listening on port $dbPort"
}

$mysqlArgs = @("-u", $dbUser)
if (-not [string]::IsNullOrWhiteSpace($dbPassword)) {
  $mysqlArgs += "-p$dbPassword"
}
$mysqlArgs += "-e"
$safeDbName = $dbName.Replace("``", "````")
$mysqlArgs += "CREATE DATABASE IF NOT EXISTS ``$safeDbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

& $mysqlExe @mysqlArgs
if ($LASTEXITCODE -ne 0) {
  throw "Failed to connect to MariaDB as $dbUser or create database $dbName"
}

Write-Host "MariaDB is ready. Database '$dbName' is available on port $dbPort"
