# Run Postgres-backed tests for audit-svc · los-svc · application-svc.
# Skips become failures (REQUIRE_DB=1).
#
#   .\scripts\test-db.ps1
#   .\scripts\test-db.ps1 -NoUp

[CmdletBinding()]
param(
    [switch]$NoUp
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $NoUp) {
    Write-Host "==> Starting test Postgres (docker-compose.db.yml)"
    docker compose -f docker-compose.db.yml up -d --wait
}

$env:REQUIRE_DB = "1"

function Get-Python {
    foreach ($c in @(
            (Join-Path $Root ".venv\Scripts\python.exe"),
            (Join-Path $Root "apps\api\.venv\Scripts\python.exe")
        )) {
        if (Test-Path $c) { return $c }
    }
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw "Python not found"
}

$py = Get-Python
$failed = $false
$matrix = @(
    @{ Name = "audit-svc"; Schema = "audit" },
    @{ Name = "los-svc"; Schema = "los" },
    @{ Name = "application-svc"; Schema = "application" }
)

foreach ($item in $matrix) {
    $svc = $item.Name
    $schema = $item.Schema
    Write-Host ""
    Write-Host "==> pytest services/$svc"
    Push-Location (Join-Path $Root "services\$svc")
    try {
        & $py -m pip install -q -r requirements.txt
        $env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres?options=-csearch_path%3D$schema&connect_timeout=3"
        $env:DIRECT_URL = $env:DATABASE_URL
        $env:DB_SCHEMA = $schema
        & $py -m pytest -q --tb=short
        if ($LASTEXITCODE -ne 0) { $failed = $true }
    }
    finally {
        Pop-Location
    }
}

if ($failed) {
    Write-Host ""
    Write-Host "test-db FAILED"
    exit 1
}
Write-Host ""
Write-Host "test-db OK (audit + los + application)"
