param(
  [ValidateSet("setup", "run")]
  [string]$Mode = "setup"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$expectedNode = [version]"24.12.0"
$expectedPnpm = [version]"10.33.0"
$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Write-Step($label, $message) {
  Write-Host ("[{0}] {1}" -f $label, $message)
}

function Add-Ok($message) {
  Write-Step " OK " $message
}

function Add-Warn($message) {
  $warnings.Add($message)
  Write-Step "WARN" $message
}

function Add-Error($message) {
  $errors.Add($message)
  Write-Step "FAIL" $message
}

function Get-VersionOrNull([string]$raw) {
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  $trimmed = $raw.Trim()
  if ($trimmed.StartsWith("v")) {
    $trimmed = $trimmed.Substring(1)
  }

  try {
    return [version]$trimmed
  } catch {
    return $null
  }
}

Set-Location $repoRoot

Write-Host ""
Write-Host "CIP local doctor ($Mode)"
Write-Host "Repo: $repoRoot"
Write-Host ""

$packageJson = Get-Content (Join-Path $repoRoot "package.json") | ConvertFrom-Json

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  Add-Error "node was not found in PATH"
} else {
  $nodeVersion = Get-VersionOrNull (& $nodeCommand.Source -v)
  if (-not $nodeVersion) {
    Add-Error "could not read Node.js version"
  } elseif ($nodeVersion.Major -ne $expectedNode.Major) {
    Add-Error "Node.js is $nodeVersion but this repo expects major $($expectedNode.Major).x"
  } elseif ($nodeVersion -ne $expectedNode) {
    Add-Warn "Node.js is $nodeVersion, recommended exact version is $expectedNode on both machines"
  } else {
    Add-Ok "Node.js = $nodeVersion"
  }
}

$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
  Add-Error "pnpm was not found in PATH"
} else {
  $pnpmVersion = Get-VersionOrNull (& $pnpmCommand.Source -v)
  if (-not $pnpmVersion) {
    Add-Error "could not read pnpm version"
  } elseif ($pnpmVersion.Major -ne $expectedPnpm.Major) {
    Add-Error "pnpm is $pnpmVersion but this repo expects major $($expectedPnpm.Major).x"
  } elseif ($pnpmVersion -ne $expectedPnpm) {
    Add-Warn "pnpm is $pnpmVersion, recommended exact version is $expectedPnpm on both machines"
  } else {
    Add-Ok "pnpm = $pnpmVersion"
  }
}

if ($packageJson.packageManager -ne "pnpm@10.33.0") {
  Add-Warn "package.json packageManager does not match pnpm@10.33.0"
} else {
  Add-Ok "packageManager = $($packageJson.packageManager)"
}

if (-not (Test-Path (Join-Path $repoRoot "pnpm-lock.yaml"))) {
  Add-Error "pnpm-lock.yaml is missing"
} else {
  Add-Ok "pnpm-lock.yaml found"
}

if (Test-Path (Join-Path $repoRoot "package-lock.json")) {
  Add-Warn "package-lock.json is present, remove it and use pnpm only"
}

if (Test-Path (Join-Path $repoRoot "yarn.lock")) {
  Add-Warn "yarn.lock is present, use pnpm only"
}

if ($Mode -eq "run") {
  if (-not (Test-Path (Join-Path $repoRoot "node_modules"))) {
    Add-Error "node_modules is missing, run pnpm install or first-time-setup.bat first"
  } else {
    Add-Ok "node_modules found"

    & $pnpmCommand.Source --filter "@cip/web" exec esbuild --version 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) {
      Add-Ok "web esbuild command is available"
    } else {
      Add-Error "web esbuild binary check failed; run pnpm repair:esbuild"
    }
  }

  if (-not (Test-Path (Join-Path $repoRoot ".env.local")) -and -not (Test-Path (Join-Path $repoRoot ".env"))) {
    Add-Warn ".env.local or .env was not found"
  }
}

Write-Host ""
if ($errors.Count -gt 0) {
  Write-Host ("Summary: {0} error(s), {1} warning(s)" -f $errors.Count, $warnings.Count)
  Write-Host "Recommended:"
  Write-Host "- Use Node.js 24.12.0"
  Write-Host "- Use pnpm 10.33.0"
  Write-Host "- Use pnpm install instead of npm install"
  exit 1
}

if ($warnings.Count -gt 0) {
  Write-Host ("Summary: passed with {0} warning(s)" -f $warnings.Count)
} else {
  Write-Host "Summary: ready"
}
