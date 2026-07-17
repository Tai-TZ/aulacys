# Project setup script (Windows PowerShell)
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = "Stop"

Write-Host "=== Project Setup ===" -ForegroundColor Cyan

# Check Python 3.11+
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Python 3.11+ required (found older or missing python on PATH)"
    exit 1
}
Write-Host "Python version OK"

# Create virtual environment
if (-not (Test-Path .venv)) {
    python -m venv .venv
    Write-Host "Created .venv"
}

# Install dependencies using the venv's python directly
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Create .env if it does not exist
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env - please edit it with your API keys"
}

# Create data directories
New-Item -ItemType Directory -Force -Path data\chroma | Out-Null

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Activate venv:  .\.venv\Scripts\Activate.ps1"
Write-Host "Run server:     uvicorn src.main:app --reload"
