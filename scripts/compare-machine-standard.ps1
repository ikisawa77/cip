param(
  [string]$ReferencePath = ".local-tools/machine-standard.json"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$referenceFullPath = Join-Path $repoRoot $ReferencePath
$currentScript = Join-Path $PSScriptRoot "standardize-local.ps1"

if (-not (Test-Path $referenceFullPath)) {
  Write-Host ("Reference report was not found: {0}" -f $referenceFullPath)
  Write-Host "Create one with: standardize-local.bat -Mode export"
  exit 1
}

$currentJson = powershell -NoProfile -ExecutionPolicy Bypass -File $currentScript -Mode export | Out-Null
$currentPath = Join-Path $repoRoot ".local-tools/machine-standard.json"

$current = Get-Content $currentPath | ConvertFrom-Json
$reference = Get-Content $referenceFullPath | ConvertFrom-Json

$checks = @(
  @{ Label = "Node.js"; Current = $current.actual.node; Reference = $reference.actual.node },
  @{ Label = "pnpm"; Current = $current.actual.pnpm; Reference = $reference.actual.pnpm },
  @{ Label = "npm"; Current = $current.actual.npm; Reference = $reference.actual.npm },
  @{ Label = "packageManager"; Current = $current.actual.packageManager; Reference = $reference.actual.packageManager },
  @{ Label = "pnpm-lock"; Current = [string]$current.files.pnpmLock; Reference = [string]$reference.files.pnpmLock },
  @{ Label = "package-lock"; Current = [string]$current.files.packageLock; Reference = [string]$reference.files.packageLock },
  @{ Label = "yarn.lock"; Current = [string]$current.files.yarnLock; Reference = [string]$reference.files.yarnLock }
)

$mismatch = $false

Write-Host ""
Write-Host ("Current machine:   {0}" -f $current.machineName)
Write-Host ("Reference machine: {0}" -f $reference.machineName)
Write-Host ""

foreach ($check in $checks) {
  $same = $check.Current -eq $check.Reference
  if (-not $same) {
    $mismatch = $true
  }

  Write-Host ("{0}: current={1} | reference={2} | match={3}" -f $check.Label, $check.Current, $check.Reference, $same)
}

Write-Host ""
if ($mismatch) {
  Write-Host "Comparison result: differences found"
  exit 1
}

Write-Host "Comparison result: both machines match on the tracked standards"
