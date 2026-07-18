# =============================================================================
# stack.ps1 - one command to run / stop / check the local SHB stack (Windows)
# =============================================================================
#
#   .\scripts\stack.ps1 up                 # start + stream logs (Ctrl+C detach)
#   .\scripts\stack.ps1 up -Profile full
#   .\scripts\stack.ps1 up -Detach         # start, no log follow
#   .\scripts\stack.ps1 up -Force          # free ports then start
#   .\scripts\stack.ps1 logs               # attach realtime logs again
#   .\scripts\stack.ps1 down
#   .\scripts\stack.ps1 status
#
# Logs + PIDs: .run/  |  Demo = in-process fallbacks  |  Full = wire HTTP seams
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("up", "down", "status", "restart", "logs", "help")]
    [string]$Command = "help",

    [ValidateSet("demo", "full")]
    [string]$Profile = "demo",

    [switch]$Setup,

    [switch]$Force,

    [switch]$Detach
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$RunDir = Join-Path $Root ".run"
$LogDir = Join-Path $RunDir "logs"
$PidFile = Join-Path $RunDir "pids.json"
$ApiDir = Join-Path $Root "services\orchestrator-svc"
$SharedDir = Join-Path $Root "packages\shared"
$LegacyApiDir = Join-Path $Root "apps\api"
$WebDir = Join-Path $Root "apps\web"
$StackPorts = @(3000, 8000, 8080, 8100, 8200, 8300, 8310, 8320, 8330, 8340, 8400)

function Resolve-Python {
    foreach ($candidate in @(
            (Join-Path $Root ".venv\Scripts\python.exe"),
            (Join-Path $ApiDir ".venv\Scripts\python.exe")
        )) {
        if (Test-Path $candidate) { return $candidate }
    }
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw "Python not found. Create .venv at repo root or apps\api\.venv"
}

function Ensure-RunDirs {
    New-Item -ItemType Directory -Force -Path $RunDir, $LogDir | Out-Null
}

function Read-Pids {
    if (-not (Test-Path $PidFile)) { return @{} }
    try {
        $obj = Get-Content $PidFile -Raw | ConvertFrom-Json
        $map = @{}
        foreach ($p in $obj.PSObject.Properties) { $map[$p.Name] = [int]$p.Value }
        return $map
    }
    catch { return @{} }
}

function Write-Pids([hashtable]$map) {
    Ensure-RunDirs
    ($map | ConvertTo-Json) | Set-Content -Path $PidFile -Encoding ascii
}

function Test-Port([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-PortPids([int]$Port) {
    $ids = @()
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.OwningProcess -gt 0) { $ids += [int]$_.OwningProcess }
    }
    return ($ids | Select-Object -Unique)
}

function Stop-PidSafe([int]$ProcessId, [string]$Name) {
    if ($ProcessId -le 0) { return }
    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if (-not $proc) { return }
        & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null
        Start-Sleep -Milliseconds 200
        if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
            Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        }
        Write-Host "  stopped $Name (pid $ProcessId)" -ForegroundColor Yellow
    }
    catch {
        Write-Host "  skip $Name (pid $ProcessId) - access denied? run terminal as same user." -ForegroundColor DarkYellow
    }
}

function Clear-StackPorts {
    Write-Host "=== Freeing stack ports ===" -ForegroundColor Cyan
    $killed = @{}
    foreach ($port in $StackPorts) {
        foreach ($pidVal in (Get-PortPids $port)) {
            if ($killed.ContainsKey($pidVal)) { continue }
            $killed[$pidVal] = $true
            $procName = ""
            $p = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
            if ($p) { $procName = $p.ProcessName }
            Write-Host "  port $port -> kill pid $pidVal ($procName)" -ForegroundColor Yellow
            & taskkill.exe /PID $pidVal /T /F 2>$null | Out-Null
            try { Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
    Start-Sleep -Seconds 1
    $busy = @()
    foreach ($port in $StackPorts) {
        if (Test-Port $port) { $busy += $port }
    }
    if ($busy.Count -gt 0) {
        Write-Host "  STILL BUSY: $($busy -join ', ')" -ForegroundColor Red
        Write-Host "  Close those apps or run PowerShell as Administrator, then retry." -ForegroundColor Red
        return $false
    }
    Write-Host "  All stack ports free." -ForegroundColor Green
    return $true
}

function Start-LoggedProcess {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$WorkingDirectory,
        [hashtable]$EnvVars = @{}
    )
    Ensure-RunDirs
    $outLog = Join-Path $LogDir "$Name.out.log"
    $errLog = Join-Path $LogDir "$Name.err.log"
    "--- start ---" | Set-Content $outLog -Encoding ascii
    "--- start ---" | Set-Content $errLog -Encoding ascii

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $quoted = @()
    foreach ($a in $ArgumentList) {
        if ($a -match '[\s"]') {
            $quoted += ('"{0}"' -f ($a -replace '"', '\"'))
        }
        else {
            $quoted += $a
        }
    }
    $psi.Arguments = ($quoted -join " ")
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    foreach ($key in $EnvVars.Keys) {
        $psi.EnvironmentVariables[$key] = [string]$EnvVars[$key]
    }

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $null = $proc.Start()
    Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -MessageData $outLog -Action {
        if ($EventArgs.Data) { Add-Content -Path $Event.MessageData -Value $EventArgs.Data }
    } | Out-Null
    Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -MessageData $errLog -Action {
        if ($EventArgs.Data) { Add-Content -Path $Event.MessageData -Value $EventArgs.Data }
    } | Out-Null
    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()

    Write-Host "  started $Name (pid $($proc.Id)) -> .run\logs\$Name.*.log" -ForegroundColor Green
    return [int]$proc.Id
}

function Get-ServiceCatalog([string]$Mode) {
    $py = Resolve-Python
    $services = New-Object System.Collections.ArrayList

    if ($Mode -eq "full") {
        $svcPythonPath = @{ PYTHONPATH = $SharedDir }
        [void]$services.Add(@{ Name = "policy"; Port = 8100; Dir = "services\policy-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8100"); Exe = $py; Env = $svcPythonPath })
        [void]$services.Add(@{ Name = "audit"; Port = 8200; Dir = "services\audit-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8200"); Exe = $py; Env = $svcPythonPath })
        [void]$services.Add(@{ Name = "cic"; Port = 8300; Dir = "services\cic-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8300"); Exe = $py; Env = $svcPythonPath })
        [void]$services.Add(@{ Name = "los"; Port = 8310; Dir = "services\los-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8310"); Exe = $py; Env = $svcPythonPath })
        [void]$services.Add(@{ Name = "aml"; Port = 8320; Dir = "services\aml-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8320"); Exe = $py; Env = $svcPythonPath })
        [void]$services.Add(@{ Name = "property"; Port = 8330; Dir = "services\property-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8330"); Exe = $py; Env = $svcPythonPath })
        [void]$services.Add(@{ Name = "income"; Port = 8340; Dir = "services\income-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8340"); Exe = $py; Env = $svcPythonPath })
        [void]$services.Add(@{ Name = "agent-worker"; Port = 8400; Dir = "services\agent-worker-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8400"); Exe = $py; Env = $svcPythonPath })
    }

    # orchestrator-svc replaces apps/api (src moved to packages/shared + this service).
    $pythonPath = "$SharedDir;$ApiDir"
    if ($Mode -eq "full") {
        $apiEnv = @{
            POLICY_SVC_URL       = "http://127.0.0.1:8100"
            AUDIT_SVC_URL        = "http://127.0.0.1:8200"
            CIC_SVC_URL          = "http://127.0.0.1:8300"
            LOS_SVC_URL          = "http://127.0.0.1:8310"
            AML_SVC_URL          = "http://127.0.0.1:8320"
            PROPERTY_SVC_URL     = "http://127.0.0.1:8330"
            INCOME_SVC_URL       = "http://127.0.0.1:8340"
            AGENT_WORKER_URL     = "http://127.0.0.1:8400"
            CORS_ORIGINS         = "http://localhost:3000"
            PYTHONPATH           = $pythonPath
        }
    }
    else {
        $apiEnv = @{
            CORS_ORIGINS = "http://localhost:3000"
            PYTHONPATH   = $pythonPath
        }
    }

    [void]$services.Add(@{
            Name = "api"
            Port = 8000
            Dir  = "services\orchestrator-svc"
            Args = @("-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000")
            Exe  = $py
            Env  = $apiEnv
        })

    $gwEnv = @{
        MONOLITH_URL = "http://127.0.0.1:8000"
        CORS_ORIGINS = "http://localhost:3000"
    }
    if ($Mode -eq "full") {
        $gwEnv["POLICY_SVC_URL"] = "http://127.0.0.1:8100"
        $gwEnv["AUDIT_SVC_URL"] = "http://127.0.0.1:8200"
        $gwEnv["CIC_SVC_URL"] = "http://127.0.0.1:8300"
        $gwEnv["LOS_SVC_URL"] = "http://127.0.0.1:8310"
        $gwEnv["AML_SVC_URL"] = "http://127.0.0.1:8320"
        $gwEnv["PROPERTY_SVC_URL"] = "http://127.0.0.1:8330"
        $gwEnv["INCOME_SVC_URL"] = "http://127.0.0.1:8340"
        $gwEnv["AGENT_WORKER_URL"] = "http://127.0.0.1:8400"
    }
    [void]$services.Add(@{
            Name = "gateway"
            Port = 8080
            Dir  = "services\api-gateway"
            Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8080")
            Exe  = $py
            Env  = $gwEnv
        })

    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCmd) { $npm = $npmCmd.Source } else { $npm = "npm.cmd" }
    [void]$services.Add(@{
            Name = "web"
            Port = 3000
            Dir  = "apps\web"
            Args = @("run", "dev", "--", "-p", "3000")
            Exe  = $npm
            Env  = @{
                NEXT_PUBLIC_API_URL     = "http://localhost:8000"
                NEXT_PUBLIC_GATEWAY_URL = "http://localhost:8080"
            }
        })

    return ,$services.ToArray()
}


function Get-LogColor([string]$Name, [string]$Stream) {
    if ($Stream -eq "err") { return "Red" }
    switch -Regex ($Name) {
        "^api$" { return "Cyan" }
        "^web$" { return "Green" }
        "^gateway$" { return "DarkCyan" }
        "worker$" { return "Magenta" }
        default { return "Gray" }
    }
}

function Invoke-FollowLogs {
    param([int]$TailLines = 30)
    Ensure-RunDirs
    if (-not (Test-Path $LogDir)) {
        Write-Host "No .run\logs yet. Start stack first: .\scripts\stack.ps1 up" -ForegroundColor Yellow
        return
    }
    $positions = @{}
    foreach ($f in (Get-ChildItem $LogDir -Filter "*.log" -ErrorAction SilentlyContinue)) {
        $lines = @(Get-Content $f.FullName -ErrorAction SilentlyContinue)
        $start = [Math]::Max(0, $lines.Count - $TailLines)
        for ($i = $start; $i -lt $lines.Count; $i++) {
            $base = $f.BaseName
            $stream = "out"
            if ($base -match "^(.*)\.(out|err)$") {
                $svc = $Matches[1]
                $stream = $Matches[2]
            }
            else { $svc = $base }
            $color = Get-LogColor $svc $stream
            Write-Host ("[{0}|{1}] {2}" -f $svc, $stream, $lines[$i]) -ForegroundColor $color
        }
        $positions[$f.FullName] = $lines.Count
    }

    Write-Host ""
    Write-Host "=== Live logs (Ctrl+C to detach; services keep running) ===" -ForegroundColor Cyan
    Write-Host "Stop stack: .\scripts\stack.ps1 down" -ForegroundColor Yellow
    Write-Host ""

    try {
        while ($true) {
            $files = @(Get-ChildItem $LogDir -Filter "*.log" -ErrorAction SilentlyContinue)
            foreach ($f in $files) {
                $path = $f.FullName
                $lines = @(Get-Content $path -ErrorAction SilentlyContinue)
                if (-not $positions.ContainsKey($path)) { $positions[$path] = 0 }
                $start = [int]$positions[$path]
                if ($start -gt $lines.Count) { $start = 0 }
                for ($i = $start; $i -lt $lines.Count; $i++) {
                    $base = $f.BaseName
                    $stream = "out"
                    if ($base -match "^(.*)\.(out|err)$") {
                        $svc = $Matches[1]
                        $stream = $Matches[2]
                    }
                    else { $svc = $base }
                    $color = Get-LogColor $svc $stream
                    Write-Host ("[{0}|{1}] {2}" -f $svc, $stream, $lines[$i]) -ForegroundColor $color
                }
                $positions[$path] = $lines.Count
            }
            Start-Sleep -Milliseconds 250
        }
    }
    finally {
        Write-Host ""
        Write-Host "Detached from logs. Services still running." -ForegroundColor Yellow
        Write-Host "  .\scripts\stack.ps1 logs    # re-attach"
        Write-Host "  .\scripts\stack.ps1 down    # stop all"
        Write-Host "  .\scripts\stack.ps1 status"
    }
}
function Invoke-Setup {
    Write-Host "=== Setup ===" -ForegroundColor Cyan
    $py = $null
    try { $py = Resolve-Python } catch { $py = $null }
    if (-not $py) {
        Write-Host "Creating root .venv..." -ForegroundColor Yellow
        python -m venv (Join-Path $Root ".venv")
        $py = Join-Path $Root ".venv\Scripts\python.exe"
        & $py -m pip install -U pip
    }
    Write-Host "Installing shared + orchestrator deps..." -ForegroundColor Yellow
    & $py -m pip install -r (Join-Path $SharedDir "requirements.txt")
    & $py -m pip install -r (Join-Path $ApiDir "requirements.txt")
    if (-not (Test-Path (Join-Path $ApiDir ".env"))) {
        if (Test-Path (Join-Path $LegacyApiDir ".env")) {
            Copy-Item (Join-Path $LegacyApiDir ".env") (Join-Path $ApiDir ".env")
            Write-Host "Copied apps\api\.env -> services\orchestrator-svc\.env" -ForegroundColor Yellow
        }
        elseif (Test-Path (Join-Path $ApiDir ".env.example")) {
            Copy-Item (Join-Path $ApiDir ".env.example") (Join-Path $ApiDir ".env")
            Write-Host "Created services\orchestrator-svc\.env from example." -ForegroundColor Yellow
        }
        elseif (Test-Path (Join-Path $LegacyApiDir ".env.example")) {
            Copy-Item (Join-Path $LegacyApiDir ".env.example") (Join-Path $ApiDir ".env")
            Write-Host "Created services\orchestrator-svc\.env from apps\api example." -ForegroundColor Yellow
        }
    }
    if (-not (Test-Path (Join-Path $WebDir ".env.local"))) {
        @(
            "NEXT_PUBLIC_API_URL=http://localhost:8000",
            "NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080"
        ) | Set-Content (Join-Path $WebDir ".env.local") -Encoding ascii
        Write-Host "Created apps\web\.env.local" -ForegroundColor Yellow
    }
    if (-not (Test-Path (Join-Path $WebDir "node_modules"))) {
        Push-Location $WebDir
        npm install --no-audit --no-fund
        Pop-Location
    }
    Write-Host "Setup OK." -ForegroundColor Green
}

function Invoke-Down {
    Write-Host "=== Stopping stack ===" -ForegroundColor Cyan
    $map = Read-Pids
    if ($map.Count -eq 0) {
        Write-Host "No .run\pids.json - will still free ports." -ForegroundColor Yellow
    }
    foreach ($name in @($map.Keys)) {
        Stop-PidSafe -ProcessId ([int]$map[$name]) -Name $name
    }
    if (Test-Path $PidFile) { Remove-Item $PidFile -Force }
    $ok = Clear-StackPorts
    if (-not $ok) { Write-Host "Done with warnings." -ForegroundColor Yellow }
    else { Write-Host "Done." -ForegroundColor Green }
}

function Invoke-Status {
    Write-Host "=== Stack status ===" -ForegroundColor Cyan
    $map = Read-Pids
    $catalog = Get-ServiceCatalog -Mode "full"
    foreach ($svc in $catalog) {
        $portUp = Test-Port $svc.Port
        $pidVal = $null
        if ($map.ContainsKey($svc.Name)) { $pidVal = $map[$svc.Name] }
        $alive = $false
        if ($pidVal) {
            $alive = [bool](Get-Process -Id $pidVal -ErrorAction SilentlyContinue)
        }
        if ($portUp) { $state = "UP  "; $color = "Green" } else { $state = "DOWN"; $color = "Red" }
        if ($pidVal) { $pidInfo = "pid=$pidVal alive=$alive" } else { $pidInfo = "untracked" }
        Write-Host ("  [{0}] {1,-20} :{2}  {3}" -f $state, $svc.Name, $svc.Port, $pidInfo) -ForegroundColor $color
    }
    Write-Host ""
    Write-Host "URLs: http://localhost:3000/admin  |  http://localhost:8000/docs  |  http://localhost:8080/status"
    Write-Host "Logs: .run\logs\"
}

function Invoke-Up([string]$Mode) {
    if ($Setup) { Invoke-Setup }

    $null = Resolve-Python
    if (-not (Test-Path (Join-Path $WebDir "node_modules"))) {
        throw "apps\web\node_modules missing. Re-run: .\scripts\stack.ps1 up -Setup"
    }

    # Always clear previous stack; -Force also kills anything on stack ports
    if ($Force -or (Test-Path $PidFile)) {
        Invoke-Down
    }
    elseif ($true) {
        # Default: free busy stack ports before start (avoids WARN skip)
        $busy = @($StackPorts | Where-Object { Test-Port $_ })
        if ($busy.Count -gt 0) {
            Write-Host "Ports busy: $($busy -join ', ') - freeing..." -ForegroundColor Yellow
            $cleared = Clear-StackPorts
            if (-not $cleared) {
                throw "Cannot free ports. Close processes or: .\scripts\stack.ps1 down"
            }
        }
    }

    Write-Host "=== Starting profile=$Mode ===" -ForegroundColor Cyan
    $catalog = Get-ServiceCatalog -Mode $Mode
    $map = @{}
    foreach ($svc in $catalog) {
        if (Test-Port $svc.Port) {
            Write-Host "  WARN port $($svc.Port) still busy - skip $($svc.Name)" -ForegroundColor Yellow
            continue
        }
        $wd = Join-Path $Root $svc.Dir
        if (-not (Test-Path $wd)) {
            Write-Host "  SKIP $($svc.Name) - missing dir $($svc.Dir)" -ForegroundColor Yellow
            continue
        }
        $pidVal = Start-LoggedProcess -Name $svc.Name -FilePath $svc.Exe -ArgumentList $svc.Args -WorkingDirectory $wd -EnvVars $svc.Env
        $map[$svc.Name] = $pidVal
        Start-Sleep -Milliseconds 400
    }
    Write-Pids $map

    Write-Host ""
    Write-Host "Waiting for API health..." -ForegroundColor Cyan
    $ok = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $r = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2
            if ($r.status -eq "ok") { $ok = $true; break }
        }
        catch { Start-Sleep -Seconds 1 }
    }
    if ($ok) {
        Write-Host "API healthy." -ForegroundColor Green
    }
    else {
        Write-Host "API not healthy yet - check .run\logs\api.err.log" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "  Web      http://localhost:3000/admin" -ForegroundColor Green
    Write-Host "  API      http://localhost:8000/docs" -ForegroundColor Green
    Write-Host "  Gateway  http://localhost:8080/status" -ForegroundColor Green
    Write-Host ""
    Write-Host "Stop all:  .\scripts\stack.ps1 down" -ForegroundColor Yellow
    Write-Host "Re-attach: .\scripts\stack.ps1 logs" -ForegroundColor Yellow
    Write-Host "Status:    .\scripts\stack.ps1 status" -ForegroundColor Yellow

    if ($Detach) {
        Write-Host ""
        Write-Host "Detached mode - logs only in .run\logs\" -ForegroundColor Yellow
    }
    else {
        Write-Host ""
        Invoke-FollowLogs
    }
}

function Show-Help {
    Write-Host "stack.ps1 - manage local API / Web / microservices"
    Write-Host ""
    Write-Host "  .\scripts\stack.ps1 up                 # start + live logs (Ctrl+C detach)"
    Write-Host "  .\scripts\stack.ps1 up -Profile full"
    Write-Host "  .\scripts\stack.ps1 up -Detach         # start without following logs"
    Write-Host "  .\scripts\stack.ps1 up -Force          # free ports then start"
    Write-Host "  .\scripts\stack.ps1 logs               # live logs again"
    Write-Host "  .\scripts\stack.ps1 down"
    Write-Host "  .\scripts\stack.ps1 status"
    Write-Host "  .\scripts\stack.ps1 restart"
    Write-Host "  .\scripts\stack.ps1 up -Setup"
}

switch ($Command) {
    "help" { Show-Help }
    "up" { Invoke-Up -Mode $Profile }
    "down" { Invoke-Down }
    "status" { Invoke-Status }
    "logs" { Invoke-FollowLogs }
    "restart" {
        $script:Force = $true
        Invoke-Down
        Start-Sleep -Seconds 1
        Invoke-Up -Mode $Profile
    }
}
