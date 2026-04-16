param(
  [ValidateSet("report", "repair", "export")]
  [string]$Mode = "report",
  [string]$OutputPath = ".local-tools/machine-standard.json"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$expectedNode = "24.12.0"
$expectedPnpm = "10.33.0"

function Get-CommandPathOrNull([string]$name) {
  $command = Get-Command $name -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    return $null
  }

  return $command.Source
}

function Get-StringOutputOrNull([scriptblock]$script) {
  try {
    $result = & $script
    if ($LASTEXITCODE -ne 0) {
      return $null
    }

    return [string]$result
  } catch {
    return $null
  }
}

function Normalize-Version([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $null
  }

  $trimmed = $value.Trim()
  if ($trimmed.StartsWith("v")) {
    $trimmed = $trimmed.Substring(1)
  }

  return $trimmed
}

function Coalesce($value, $fallback) {
  if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) {
    return $fallback
  }

  return $value
}

function New-Report() {
  $nodePath = Get-CommandPathOrNull "node"
  $pnpmPath = Get-CommandPathOrNull "pnpm"
  $npmPath = Get-CommandPathOrNull "npm"
  $voltaPath = Get-CommandPathOrNull "volta"
  $wingetPath = Get-CommandPathOrNull "winget"

  $nodeVersion = if ($nodePath) { Normalize-Version (Get-StringOutputOrNull { & $nodePath -v }) } else { $null }
  $pnpmVersion = if ($pnpmPath) { Normalize-Version (Get-StringOutputOrNull { & $pnpmPath -v }) } else { $null }
  $npmVersion = if ($npmPath) { Normalize-Version (Get-StringOutputOrNull { & $npmPath -v }) } else { $null }

  $packageJson = Get-Content (Join-Path $repoRoot "package.json") | ConvertFrom-Json

  [pscustomobject]@{
    generatedAt = (Get-Date).ToString("o")
    repoRoot = $repoRoot
    machineName = $env:COMPUTERNAME
    expected = [pscustomobject]@{
      node = $expectedNode
      pnpm = $expectedPnpm
      packageManager = "pnpm@10.33.0"
    }
    actual = [pscustomobject]@{
      node = $nodeVersion
      pnpm = $pnpmVersion
      npm = $npmVersion
      packageManager = $packageJson.packageManager
      nodePath = $nodePath
      pnpmPath = $pnpmPath
      npmPath = $npmPath
      voltaPath = $voltaPath
      wingetPath = $wingetPath
    }
    files = [pscustomobject]@{
      nvmrc = Test-Path (Join-Path $repoRoot ".nvmrc")
      nodeVersion = Test-Path (Join-Path $repoRoot ".node-version")
      npmrc = Test-Path (Join-Path $repoRoot ".npmrc")
      pnpmLock = Test-Path (Join-Path $repoRoot "pnpm-lock.yaml")
      packageLock = Test-Path (Join-Path $repoRoot "package-lock.json")
      yarnLock = Test-Path (Join-Path $repoRoot "yarn.lock")
    }
  }
}

function Write-ReportSummary($report) {
  Write-Host ""
  Write-Host "CIP machine standard report"
  Write-Host ("Machine: {0}" -f $report.machineName)
  Write-Host ("Node:    expected {0} | actual {1}" -f $report.expected.node, (Coalesce $report.actual.node "missing"))
  Write-Host ("pnpm:    expected {0} | actual {1}" -f $report.expected.pnpm, (Coalesce $report.actual.pnpm "missing"))
  Write-Host ("npm:     actual {0}" -f (Coalesce $report.actual.npm "missing"))
  Write-Host ("Volta:   {0}" -f (Coalesce $report.actual.voltaPath "missing"))
  Write-Host ("winget:  {0}" -f (Coalesce $report.actual.wingetPath "missing"))
  Write-Host ("Locks:   pnpm-lock={0} package-lock={1} yarn.lock={2}" -f $report.files.pnpmLock, $report.files.packageLock, $report.files.yarnLock)
  Write-Host ""
}

function Invoke-Repair($report) {
  $needsNode = $report.actual.node -ne $expectedNode
  $needsPnpm = $report.actual.pnpm -ne $expectedPnpm

  if (-not $needsNode -and -not $needsPnpm) {
    Write-Host "This machine already matches the repo standard."
    return
  }

  if ($report.actual.voltaPath) {
    Write-Host "Using Volta to align this machine with the repo standard..."
    & $report.actual.voltaPath install "node@$expectedNode" "pnpm@$expectedPnpm"
    return
  }

  Write-Host "Volta was not found, so repair cannot be completed automatically."
  Write-Host "Recommended standardization path:"
  Write-Host "1. Install Volta"
  Write-Host "   winget install Volta.Volta"
  Write-Host "2. Open a new terminal"
  Write-Host ("3. Run: volta install node@{0} pnpm@{1}" -f $expectedNode, $expectedPnpm)
  Write-Host "4. Run: doctor-local.bat"
  Write-Host ""

  if ($report.actual.wingetPath) {
    Write-Host "Fallback if you do not want Volta:"
    Write-Host "1. Use winget to install Node.js 24"
    Write-Host "2. Run: npm install -g pnpm@10.33.0"
    Write-Host "3. Run: doctor-local.bat"
  }
}

Set-Location $repoRoot
$report = New-Report

switch ($Mode) {
  "report" {
    Write-ReportSummary $report
  }
  "repair" {
    Write-ReportSummary $report
    Invoke-Repair $report
  }
  "export" {
    $destination = Join-Path $repoRoot $OutputPath
    $directory = Split-Path -Parent $destination
    if (-not (Test-Path $directory)) {
      New-Item -ItemType Directory -Path $directory | Out-Null
    }

    $report | ConvertTo-Json -Depth 6 | Set-Content -Path $destination
    Write-ReportSummary $report
    Write-Host ("Saved machine report to {0}" -f $destination)
  }
}
