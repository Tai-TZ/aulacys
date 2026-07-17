# Run the project on Windows — thin wrapper around stack.ps1 (demo profile).
# Prefer:  .\scripts\stack.ps1 up | down | status
#
#   powershell -ExecutionPolicy Bypass -File scripts\run.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\run.ps1 -Setup

[CmdletBinding()]
param([switch]$Setup)

$stack = Join-Path $PSScriptRoot "stack.ps1"
$argsList = @("up", "-Profile", "demo")
if ($Setup) { $argsList += "-Setup" }
& powershell -NoProfile -ExecutionPolicy Bypass -File $stack @argsList
exit $LASTEXITCODE
