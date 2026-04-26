$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Repairing local esbuild/Vite toolchain..."
Write-Host "This refreshes pnpm's local store and reinstalls native esbuild binaries."

pnpm store prune
pnpm install --force --lockfile=true

pnpm --filter "@cip/web" exec esbuild --version | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "esbuild still failed after repair."
}

Write-Host "esbuild is healthy for @cip/web."
