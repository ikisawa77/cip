@echo off
setlocal

cd /d "%~dp0"

echo Stopping CIP localhost servers on ports 3001 and 5173...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = @(3001,5173); " ^
  "$killed = @(); " ^
  "foreach ($port in $ports) { " ^
  "  $pids = @(); " ^
  "  try { $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique } catch {} " ^
  "  if (-not $pids) { " ^
  "    $netstat = netstat -ano -p tcp | Select-String (':'+$port+'\s'); " ^
  "    foreach ($line in $netstat) { " ^
  "      $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne '' }; " ^
  "      if ($parts.Length -ge 5) { $pids += [int]$parts[-1] } " ^
  "    } " ^
  "    $pids = $pids | Select-Object -Unique; " ^
  "  } " ^
  "  foreach ($pidValue in $pids) { " ^
  "    try { Stop-Process -Id $pidValue -Force -ErrorAction Stop; $killed += ('port '+$port+' -> PID '+$pidValue) } catch {} " ^
  "  } " ^
  "} " ^
  "if ($killed.Count -eq 0) { Write-Host 'No running dev servers found.' } else { $killed | ForEach-Object { Write-Host ('Stopped ' + $_) } }"

echo.
echo Done.
pause

endlocal
