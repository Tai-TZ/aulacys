# Run the project on Windows: preflight-check first, then start API + Web.
# If a check fails, it reports exactly what's wrong and stops (does NOT start anything).
#
#   powershell -ExecutionPolicy Bypass -File scripts\run.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\run.ps1 -Setup   # auto-fix venv/deps/.env then run
#
# Exit 0 = started. 1 = a check failed (see the report).

[CmdletBinding()]
param(
    [switch]$Setup   # bootstrap missing venv / node_modules / .env before running
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$api  = Join-Path $root "apps\api"
$web  = Join-Path $root "apps\web"
$venvPy = Join-Path $api ".venv\Scripts\python.exe"

Write-Host ""
Write-Host "=== Preflight ===" -ForegroundColor Cyan

# --- 1. Terminal tools (git/python/node/npm) --------------------------------
$toolCheck = Join-Path $PSScriptRoot "check-tools.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $toolCheck | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Host "STOP: required terminal tools are missing/outdated (report above)." -ForegroundColor Red
    Write-Host "Fix:  powershell -ExecutionPolicy Bypass -File scripts\check-tools.ps1 -Install" -ForegroundColor Yellow
    exit 1
}

# --- 2. Optional bootstrap ---------------------------------------------------
if ($Setup) {
    Write-Host ""
    Write-Host "=== Setup (bootstrap) ===" -ForegroundColor Cyan
    if (-not (Test-Path $venvPy)) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $api "scripts\setup.ps1") | Out-Host
    }
    if (-not (Test-Path (Join-Path $web "node_modules"))) {
        Push-Location $web; npm install --no-audit --no-fund | Out-Host; Pop-Location
    }
}

# --- 3. Project checks -------------------------------------------------------
$problems = @()

# Backend venv + deps
if (-not (Test-Path $venvPy)) {
    $problems += "Backend venv missing. Fix: cd apps\api; powershell -ExecutionPolicy Bypass -File scripts\setup.ps1   (or re-run with -Setup)"
}
else {
    & $venvPy -c "import fastapi, uvicorn, langgraph" 2>$null
    if ($LASTEXITCODE -ne 0) {
        $problems += "Backend deps not installed in .venv. Fix: cd apps\api; .\.venv\Scripts\python.exe -m pip install -r requirements.txt   (or -Setup)"
    }
}

# Backend .env + API key
$apiEnv = Join-Path $api ".env"
if (-not (Test-Path $apiEnv)) {
    $problems += "apps\api\.env missing. Fix: cd apps\api; Copy-Item .env.example .env; then set OPENAI_API_KEY"
}
else {
    $envText = Get-Content $apiEnv -Raw
    if ($envText -notmatch "OPENAI_API_KEY=\S" -or $envText -match "OPENAI_API_KEY=sk-your-key-here") {
        $problems += "OPENAI_API_KEY not set in apps\api\.env (still the placeholder). Edit it with your real key."
    }
}

# Frontend deps
if (-not (Test-Path (Join-Path $web "node_modules"))) {
    $problems += "Frontend deps missing. Fix: cd apps\web; npm install   (or re-run with -Setup)"
}

# Ports free (warn only)
foreach ($p in 8000, 3000) {
    if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "WARNING: port $p already in use - the dev server may fail to bind." -ForegroundColor Yellow
    }
}

# --- 4. Report or run --------------------------------------------------------
if ($problems.Count -gt 0) {
    Write-Host ""
    Write-Host "NOT READY - fix these first:" -ForegroundColor Red
    foreach ($p in $problems) { Write-Host "  - $p" }
    Write-Host ""
    Write-Host "Tip: 'scripts\run.ps1 -Setup' auto-creates the venv, installs deps, and copies .env." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "All checks passed. Starting..." -ForegroundColor Green

# API in its own window (auto-reload)
Start-Process -FilePath $venvPy `
    -ArgumentList "-m", "uvicorn", "src.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $api

# Web in its own window
Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $web

Start-Sleep -Seconds 2
Write-Host ""
Write-Host "  API   -> http://localhost:8000/docs" -ForegroundColor Green
Write-Host "  Web   -> http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Each runs in its own window. Close those windows to stop." -ForegroundColor Yellow
exit 0
