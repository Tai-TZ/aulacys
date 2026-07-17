# Preflight tool check for Windows.
# Verifies the terminal tools this repo needs, prints status + install hints,
# and can auto-install missing ones via winget.
#
# Run:            powershell -ExecutionPolicy Bypass -File scripts\check-tools.ps1
# Auto-install:   powershell -ExecutionPolicy Bypass -File scripts\check-tools.ps1 -Install
#
# Exit code 0 = all required tools OK. 1 = something required is missing/outdated.

[CmdletBinding()]
param(
    [switch]$Install   # try to install missing REQUIRED tools with winget
)

$ErrorActionPreference = "Continue"   # report every tool; don't abort on the first miss

function Get-Version {
    param([string]$Cmd, [string]$Arg = "--version")
    if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) { return $null }
    try {
        $out = (& $Cmd $Arg 2>&1 | Out-String)
        if ($out -match '(\d+)\.(\d+)(?:\.(\d+))?') {
            $patch = 0
            if ($Matches[3]) { $patch = [int]$Matches[3] }
            return [pscustomobject]@{
                Major = [int]$Matches[1]
                Minor = [int]$Matches[2]
                Patch = $patch
                Raw   = $Matches[0]
            }
        }
        return [pscustomobject]@{ Major = 0; Minor = 0; Patch = 0; Raw = $out.Trim() }
    } catch {
        return $null
    }
}

function Test-Min {
    param($V, [int]$Major, [int]$Minor)
    if ($null -eq $V) { return $false }
    if ($V.Major -gt $Major) { return $true }
    if ($V.Major -eq $Major -and $V.Minor -ge $Minor) { return $true }
    return $false
}

# Tool definitions --------------------------------------------------------
$tools = @(
    @{ Name = "Git";            Cmd = "git";    Arg = "--version"; MinMajor = 2;  MinMinor = 0;  Required = $true;  Winget = "Git.Git";             Url = "https://git-scm.com/download/win" }
    @{ Name = "Python";         Cmd = "python"; Arg = "--version"; MinMajor = 3;  MinMinor = 11; Required = $true;  Winget = "Python.Python.3.12";  Url = "https://www.python.org/downloads/windows/" }
    @{ Name = "Node.js";        Cmd = "node";   Arg = "--version"; MinMajor = 18; MinMinor = 17; Required = $true;  Winget = "OpenJS.NodeJS.LTS";   Url = "https://nodejs.org/en/download" }
    @{ Name = "npm";            Cmd = "npm";    Arg = "--version"; MinMajor = 9;  MinMinor = 0;  Required = $true;  Winget = "";                    Url = "(bundled with Node.js)" }
    @{ Name = "Docker Desktop"; Cmd = "docker"; Arg = "--version"; MinMajor = 20; MinMinor = 0;  Required = $false; Winget = "Docker.DockerDesktop";Url = "https://www.docker.com/products/docker-desktop/" }
)

$hasWinget = [bool](Get-Command winget -ErrorAction SilentlyContinue)
$missingRequired = @()

Write-Host ""
Write-Host "=== Dev tools check (Windows) ===" -ForegroundColor Cyan
Write-Host ""

foreach ($t in $tools) {
    $v = Get-Version -Cmd $t.Cmd -Arg $t.Arg
    $tag = if ($t.Required) { "required" } else { "optional" }

    if ($null -eq $v) {
        $status = "MISSING"
        $color = if ($t.Required) { "Red" } else { "Yellow" }
        if ($t.Required) { $missingRequired += $t }
    }
    elseif (-not (Test-Min $v $t.MinMajor $t.MinMinor)) {
        $status = "OUTDATED (have $($v.Raw), need >= $($t.MinMajor).$($t.MinMinor))"
        $color = if ($t.Required) { "Red" } else { "Yellow" }
        if ($t.Required) { $missingRequired += $t }
    }
    else {
        $status = "OK  $($v.Raw)"
        $color = "Green"
    }

    "{0,-16} [{1}]  " -f $t.Name, $tag | Write-Host -NoNewline
    Write-Host $status -ForegroundColor $color
}

# Special case: python found but pip missing
if (Get-Command python -ErrorAction SilentlyContinue) {
    & python -m pip --version 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "pip              [required]  MISSING (run: python -m ensurepip --upgrade)" -ForegroundColor Red
    }
}

Write-Host ""

if ($missingRequired.Count -eq 0) {
    Write-Host "All required tools present. You're good to go." -ForegroundColor Green
    Write-Host ""
    exit 0
}

# Something is missing -----------------------------------------------------
Write-Host "Missing/outdated required tools: $($missingRequired.Name -join ', ')" -ForegroundColor Red
Write-Host ""

if ($Install -and $hasWinget) {
    Write-Host "Installing via winget..." -ForegroundColor Cyan
    foreach ($t in $missingRequired) {
        if (-not $t.Winget) { continue }
        Write-Host ">> winget install $($t.Winget)"
        try {
            winget install --id $t.Winget -e --source winget --accept-package-agreements --accept-source-agreements
        } catch {
            Write-Host "   Failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    Write-Host "Done. CLOSE and REOPEN your terminal so PATH refreshes, then re-run this script." -ForegroundColor Yellow
}
else {
    Write-Host "Install commands:" -ForegroundColor Cyan
    if ($hasWinget) {
        foreach ($t in $missingRequired) {
            if ($t.Winget) {
                Write-Host ("  winget install --id {0} -e" -f $t.Winget)
            } else {
                Write-Host ("  {0}: {1}" -f $t.Name, $t.Url)
            }
        }
        Write-Host ""
        Write-Host "Or auto-install all:  powershell -ExecutionPolicy Bypass -File scripts\check-tools.ps1 -Install" -ForegroundColor Cyan
    }
    else {
        Write-Host "  winget not found (needs Windows 10 1809+/11 or 'App Installer' from the Microsoft Store)." -ForegroundColor Yellow
        Write-Host "  Download manually:"
        foreach ($t in $missingRequired) {
            Write-Host ("  {0}: {1}" -f $t.Name, $t.Url)
        }
    }
    Write-Host ""
    Write-Host "After installing, CLOSE and REOPEN your terminal (PATH refresh), then re-run this script." -ForegroundColor Yellow
}

Write-Host ""
exit 1
