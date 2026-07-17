# =============================================================================
# stack.ps1 — one command to run / stop / check the local SHB stack (Windows)
# =============================================================================
#
#   .\scripts\stack.ps1 up              # demo: API :8000 + Web :3000 (+ gateway :8080)
#   .\scripts\stack.ps1 up -Profile full  # + policy/audit/tools/agent workers
#   .\scripts\stack.ps1 down
#   .\scripts\stack.ps1 status
#   .\scripts\stack.ps1 restart
#   .\scripts\stack.ps1 up -Setup       # bootstrap venv / npm if missing
#
# Logs + PIDs live under .run/ (gitignored). Demo path stays demo-proof:
# without OPENAI_API_KEY / without microservice URLs, monolith uses fallbacks.
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("up", "down", "status", "restart", "help")]
    [string]$Command = "help",

    [ValidateSet("demo", "full")]
    [string]$Profile = "demo",

    [switch]$Setup
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$RunDir = Join-Path $Root ".run"
$LogDir = Join-Path $RunDir "logs"
$PidFile = Join-Path $RunDir "pids.json"
$ApiDir = Join-Path $Root "apps\api"
$WebDir = Join-Path $Root "apps\web"

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
    if (-not (Test-Path $PidFile)) { return [ordered]@{} }
    try {
        $obj = Get-Content $PidFile -Raw | ConvertFrom-Json
        $map = [ordered]@{}
        foreach ($p in $obj.PSObject.Properties) { $map[$p.Name] = [int]$p.Value }
        return $map
    }
    catch { return [ordered]@{} }
}

function Write-Pids([hashtable]$map) {
    Ensure-RunDirs
    ($map | ConvertTo-Json) | Set-Content -Path $PidFile -Encoding utf8
}

function Test-Port([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Stop-PidSafe([int]$ProcessId, [string]$Name) {
    if ($ProcessId -le 0) { return }
    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if (-not $proc) { return }
        & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null
        Write-Host "  stopped $Name (pid $ProcessId)" -ForegroundColor Yellow
    }
    catch {
        Write-Host "  skip $Name (pid $ProcessId): $_" -ForegroundColor DarkYellow
    }
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
    "--- start $(Get-Date -Format o) ---" | Set-Content $outLog -Encoding utf8
    "--- start $(Get-Date -Format o) ---" | Set-Content $errLog -Encoding utf8

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = ($ArgumentList | ForEach-Object {
            if ($_ -match '[\s"]') { '"{0}"' -f ($_ -replace '"', '\"') } else { $_ }
        }) -join " "
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
    # Async drain so buffers never fill / deadlock
    Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -MessageData $outLog -Action {
        if ($EventArgs.Data) { Add-Content -Path $Event.MessageData -Value $EventArgs.Data }
    } | Out-Null
    Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -MessageData $errLog -Action {
        if ($EventArgs.Data) { Add-Content -Path $Event.MessageData -Value $EventArgs.Data }
    } | Out-Null
    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()

    Write-Host "  started $Name (pid $($proc.Id)) → .run\logs\$Name.*.log" -ForegroundColor Green
    return [int]$proc.Id
}

function Get-ServiceCatalog([string]$Mode) {
    $py = Resolve-Python
    $services = [System.Collections.Generic.List[object]]::new()

    if ($Mode -eq "full") {
        $services.Add(@{ Name = "policy"; Port = 8100; Dir = "services\policy-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8100"); Exe = $py; Env = @{} })
        $services.Add(@{ Name = "audit"; Port = 8200; Dir = "services\audit-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8200"); Exe = $py; Env = @{} })
        $services.Add(@{ Name = "cic"; Port = 8300; Dir = "services\cic-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8300"); Exe = $py; Env = @{} })
        $services.Add(@{ Name = "los"; Port = 8310; Dir = "services\los-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8310"); Exe = $py; Env = @{} })
        $services.Add(@{ Name = "aml"; Port = 8320; Dir = "services\aml-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8320"); Exe = $py; Env = @{} })
        $services.Add(@{ Name = "property"; Port = 8330; Dir = "services\property-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8330"); Exe = $py; Env = @{} })
        $services.Add(@{ Name = "income"; Port = 8340; Dir = "services\income-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8340"); Exe = $py; Env = @{} })
        $services.Add(@{ Name = "credit-worker"; Port = 8401; Dir = "services\agent-worker-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8401"); Exe = $py; Env = @{ AGENT_NAME = "credit" } })
        $services.Add(@{ Name = "operations-worker"; Port = 8402; Dir = "services\agent-worker-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8402"); Exe = $py; Env = @{ AGENT_NAME = "operations" } })
        $services.Add(@{ Name = "compliance-worker"; Port = 8403; Dir = "services\agent-worker-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8403"); Exe = $py; Env = @{ AGENT_NAME = "compliance" } })
        $services.Add(@{ Name = "critic-worker"; Port = 8404; Dir = "services\agent-worker-svc"; Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8404"); Exe = $py; Env = @{ AGENT_NAME = "critic" } })
    }

    $apiEnv = @{}
    if ($Mode -eq "full") {
        $apiEnv = @{
            POLICY_SVC_URL        = "http://127.0.0.1:8100"
            AUDIT_SVC_URL         = "http://127.0.0.1:8200"
            CIC_SVC_URL           = "http://127.0.0.1:8300"
            LOS_SVC_URL           = "http://127.0.0.1:8310"
            AML_SVC_URL           = "http://127.0.0.1:8320"
            PROPERTY_SVC_URL      = "http://127.0.0.1:8330"
            INCOME_SVC_URL        = "http://127.0.0.1:8340"
            CREDIT_AGENT_URL      = "http://127.0.0.1:8401"
            OPERATIONS_AGENT_URL  = "http://127.0.0.1:8402"
            COMPLIANCE_AGENT_URL  = "http://127.0.0.1:8403"
            CRITIC_AGENT_URL      = "http://127.0.0.1:8404"
            CORS_ORIGINS          = "http://localhost:3000"
        }
    }
    else {
        $apiEnv = @{ CORS_ORIGINS = "http://localhost:3000" }
    }

    $services.Add(@{
            Name = "api"
            Port = 8000
            Dir  = "apps\api"
            Args = @("-m", "uvicorn", "src.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000")
            Exe  = $py
            Env  = $apiEnv
        })

    $gwEnv = @{
        MONOLITH_URL   = "http://127.0.0.1:8000"
        CORS_ORIGINS   = "http://localhost:3000"
    }
    if ($Mode -eq "full") {
        $gwEnv["POLICY_SVC_URL"] = "http://127.0.0.1:8100"
        $gwEnv["AUDIT_SVC_URL"] = "http://127.0.0.1:8200"
        $gwEnv["CIC_SVC_URL"] = "http://127.0.0.1:8300"
        $gwEnv["LOS_SVC_URL"] = "http://127.0.0.1:8310"
        $gwEnv["AML_SVC_URL"] = "http://127.0.0.1:8320"
        $gwEnv["PROPERTY_SVC_URL"] = "http://127.0.0.1:8330"
        $gwEnv["INCOME_SVC_URL"] = "http://127.0.0.1:8340"
        $gwEnv["CREDIT_AGENT_URL"] = "http://127.0.0.1:8401"
        $gwEnv["OPERATIONS_AGENT_URL"] = "http://127.0.0.1:8402"
        $gwEnv["COMPLIANCE_AGENT_URL"] = "http://127.0.0.1:8403"
        $gwEnv["CRITIC_AGENT_URL"] = "http://127.0.0.1:8404"
    }
    $services.Add(@{
            Name = "gateway"
            Port = 8080
            Dir  = "services\api-gateway"
            Args = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8080")
            Exe  = $py
            Env  = $gwEnv
        })

    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $npm = if ($npmCmd) { $npmCmd.Source } else { "npm.cmd" }
    $services.Add(@{
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

    return $services
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
        & $py -m pip install -r (Join-Path $ApiDir "requirements.txt")
    }
    if (-not (Test-Path (Join-Path $ApiDir ".env"))) {
        Copy-Item (Join-Path $ApiDir ".env.example") (Join-Path $ApiDir ".env")
        Write-Host "Created apps\api\.env from example (OPENAI_API_KEY optional — fallback works)." -ForegroundColor Yellow
    }
    if (-not (Test-Path (Join-Path $WebDir ".env.local"))) {
        @"
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080
"@ | Set-Content (Join-Path $WebDir ".env.local") -Encoding utf8
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
        Write-Host "No .run\pids.json — nothing tracked. (Orphan listeners may remain on ports.)" -ForegroundColor Yellow
    }
    foreach ($name in @($map.Keys)) {
        Stop-PidSafe -ProcessId ([int]$map[$name]) -Name $name
    }
    if (Test-Path $PidFile) { Remove-Item $PidFile -Force }
    Write-Host "Done." -ForegroundColor Green
}

function Invoke-Status {
    Write-Host "=== Stack status ===" -ForegroundColor Cyan
    $map = Read-Pids
    $catalog = Get-ServiceCatalog -Mode "full"
    $seen = @{}
    foreach ($svc in $catalog) {
        $seen[$svc.Name] = $true
        $portUp = Test-Port $svc.Port
        $pidVal = if ($map.Contains($svc.Name)) { $map[$svc.Name] } else { $null }
        $alive = $false
        if ($pidVal) {
            $alive = [bool](Get-Process -Id $pidVal -ErrorAction SilentlyContinue)
        }
        $state = if ($portUp) { "UP  " } else { "DOWN" }
        $color = if ($portUp) { "Green" } else { "Red" }
        $pidInfo = if ($pidVal) { "pid=$pidVal alive=$alive" } else { "untracked" }
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

    Write-Host "=== Starting profile=$Mode ===" -ForegroundColor Cyan
    # Stop previous tracked stack first
    if (Test-Path $PidFile) {
        Write-Host "Stopping previous tracked processes..." -ForegroundColor Yellow
        Invoke-Down
    }

    $catalog = Get-ServiceCatalog -Mode $Mode
    $map = [ordered]@{}
    foreach ($svc in $catalog) {
        if (Test-Port $svc.Port) {
            Write-Host "  WARN port $($svc.Port) already in use — skip starting $($svc.Name)" -ForegroundColor Yellow
            continue
        }
        $wd = Join-Path $Root $svc.Dir
        if (-not (Test-Path $wd)) {
            Write-Host "  SKIP $($svc.Name) — missing dir $($svc.Dir)" -ForegroundColor Yellow
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
        Write-Host "API not healthy yet — check .run\logs\api.err.log" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "  Web      http://localhost:3000/admin" -ForegroundColor Green
    Write-Host "  API      http://localhost:8000/docs" -ForegroundColor Green
    Write-Host "  Gateway  http://localhost:8080/status" -ForegroundColor Green
    Write-Host ""
    Write-Host "Stop all:  .\scripts\stack.ps1 down" -ForegroundColor Yellow
    Write-Host "Status:    .\scripts\stack.ps1 status" -ForegroundColor Yellow
}

function Show-Help {
    @"
stack.ps1 — manage local API / Web / microservices

  .\scripts\stack.ps1 up                 # demo: api + gateway + web
  .\scripts\stack.ps1 up -Profile full   # + policy/audit/tools/workers
  .\scripts\stack.ps1 up -Setup          # create venv/.env/npm if needed
  .\scripts\stack.ps1 down
  .\scripts\stack.ps1 status
  .\scripts\stack.ps1 restart

Demo = monolith in-process fallbacks (no service URLs). Full wires HTTP seams.
Docker alternative: docker compose -f docker-compose.services.yml up --build
"@ | Write-Host
}

switch ($Command) {
    "help" { Show-Help }
    "up" { Invoke-Up -Mode $Profile }
    "down" { Invoke-Down }
    "status" { Invoke-Status }
    "restart" {
        Invoke-Down
        Start-Sleep -Seconds 1
        Invoke-Up -Mode $Profile
    }
}
