$ErrorActionPreference = "Stop"

$ports = @(3001, 5173, 5174, 5175)
$killed = [System.Collections.Generic.List[string]]::new()

foreach ($port in $ports) {
  $pids = @()

  try {
    $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
      Select-Object -ExpandProperty OwningProcess -Unique
  } catch {
    $pids = @()
  }

  foreach ($pidValue in $pids) {
    try {
      Stop-Process -Id $pidValue -Force -ErrorAction Stop
      $killed.Add("port $port -> PID $pidValue")
    } catch {
    }
  }
}

Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -eq "cmd.exe" -and $_.CommandLine -match "\bgnode\b") -or
    ($_.Name -eq "gnode.exe") -or
    ($_.Name -match "^(node|pnpm|cmd)\.exe$" -and $_.CommandLine -match "C:\\cip" -and $_.CommandLine -match "(tsx.*watch src/index\.ts|vite --config|run-api-local\.bat|run-web-local\.bat|@cip/api dev|@cip/web dev)")
  } |
  ForEach-Object {
    try {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
      $killed.Add("stale localhost helper -> PID $($_.ProcessId)")
    } catch {
    }
  }

if ($killed.Count -eq 0) {
  Write-Host "No CIP localhost servers found."
} else {
  $killed | ForEach-Object { Write-Host "Stopped $_" }
}
