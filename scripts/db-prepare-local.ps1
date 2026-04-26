param(
  [switch]$SkipSeed,
  [switch]$RunDrizzlePush
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Read-EnvFile {
  param([string]$Path)
  $values = @{}
  if (-not (Test-Path $Path)) {
    return $values
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $parts = $line.Split("=", 2)
    $values[$parts[0].Trim()] = $parts[1].Trim().Trim('"')
  }

  return $values
}

function Get-EnvValue {
  param([hashtable]$Values, [string]$Name, [string]$Default)
  $envItem = Get-Item -Path "Env:$Name" -ErrorAction SilentlyContinue
  if ($envItem -and $envItem.Value) {
    return $envItem.Value
  }

  if ($Values.ContainsKey($Name)) {
    return $Values[$Name]
  }

  return $Default
}

$envValues = Read-EnvFile (Join-Path $repoRoot ".env.local")
$dbHost = Get-EnvValue $envValues "DB_HOST" "127.0.0.1"
$dbPort = Get-EnvValue $envValues "DB_PORT" "3306"
$dbUser = Get-EnvValue $envValues "DB_USER" "root"
$dbPassword = Get-EnvValue $envValues "DB_PASSWORD" ""
$dbName = Get-EnvValue $envValues "DB_NAME" "cip_local"

$mysql = Get-Command mysql.exe -ErrorAction SilentlyContinue
if (-not $mysql -and (Test-Path "C:\xampp\mysql\bin\mysql.exe")) {
  $mysql = Get-Item "C:\xampp\mysql\bin\mysql.exe"
}

if (-not $mysql) {
  throw "mysql.exe not found. Start MariaDB/MySQL and add mysql.exe to PATH, or install XAMPP."
}

$mysqlArgs = @("-h", $dbHost, "-P", $dbPort, "-u", $dbUser)
if ($dbPassword) {
  $mysqlArgs += "-p$dbPassword"
}

Write-Host "Ensuring database '$dbName' exists..."
$mysqlPath = if ($mysql.Source) { $mysql.Source } else { $mysql.FullName }

try {
  & $mysqlPath @mysqlArgs -e "SELECT 1;" | Out-Null
} catch {
  $xamppMysql = "C:\xampp\mysql\bin\mysqld.exe"
  $xamppConfig = "C:\xampp\mysql\bin\my.ini"
  if (Test-Path $xamppMysql) {
    Write-Host "MySQL is not accepting connections. Starting XAMPP MySQL..."
    Start-Process -FilePath $xamppMysql -ArgumentList @("--defaults-file=$xamppConfig", "--console") -WindowStyle Hidden
    Start-Sleep -Seconds 5
  }

  & $mysqlPath @mysqlArgs -e "SELECT 1;" | Out-Null
}

$safeDbName = $dbName.Replace("``", "````")
& $mysqlPath @mysqlArgs -e "CREATE DATABASE IF NOT EXISTS ``$safeDbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

$dbMysqlArgs = $mysqlArgs + @($dbName)

function Invoke-MySqlStatement {
  param([string]$Sql)
  & $mysqlPath @dbMysqlArgs -e $Sql
}

function Invoke-MySqlFile {
  param([string]$Path)
  Get-Content -LiteralPath $Path -Raw | & $mysqlPath @dbMysqlArgs
}

Write-Host "Applying repository SQL migrations..."
Invoke-MySqlStatement "CREATE TABLE IF NOT EXISTS schema_migrations (id VARCHAR(191) PRIMARY KEY, applied_at DATETIME NOT NULL) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

$migrationsDir = Join-Path $PSScriptRoot "migrations"
if (Test-Path $migrationsDir) {
  Get-ChildItem -LiteralPath $migrationsDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    $migrationId = $_.Name
    $escapedMigrationId = $migrationId.Replace("'", "''")
    $alreadyAppliedOutput = & $mysqlPath @dbMysqlArgs -N -B -e "SELECT id FROM schema_migrations WHERE id = '$escapedMigrationId' LIMIT 1;"
    $alreadyApplied = if ($null -eq $alreadyAppliedOutput) { "" } else { "$alreadyAppliedOutput".Trim() }

    if ($alreadyApplied) {
      Write-Host " - $migrationId already applied"
      return
    }

    Write-Host " - applying $migrationId"
    Invoke-MySqlFile $_.FullName
    Invoke-MySqlStatement "INSERT INTO schema_migrations (id, applied_at) VALUES ('$escapedMigrationId', NOW());"
  }
} else {
  Write-Host " - no scripts/migrations directory found"
}

if ($RunDrizzlePush) {
  Write-Host "Running Drizzle push as an explicit extra sync step..."
  $drizzle = Start-Process -FilePath "pnpm" -ArgumentList @("--filter", "@cip/api", "exec", "drizzle-kit", "push") -NoNewWindow -PassThru -Wait
  if ($drizzle.ExitCode -ne 0) {
    throw "Drizzle push failed with exit code $($drizzle.ExitCode)."
  }
}

if (-not $SkipSeed) {
  Write-Host "Seeding demo data..."
  pnpm db:seed
}

Write-Host "Database is ready: $dbName@${dbHost}:${dbPort}"
