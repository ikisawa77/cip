$ErrorActionPreference = "SilentlyContinue"

Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -eq "cmd.exe" -and $_.CommandLine -match "\bgnode\b") -or
    ($_.Name -eq "gnode.exe")
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
