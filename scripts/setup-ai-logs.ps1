param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
        'nguyen-thanh-tai',
        'nguyen-thanh-toan',
        'hoang-kim-tuan-anh',
        'nguyen-minh-anh',
        'vu-huyen-dieu'
    )]
    [string]$Member
)

$ErrorActionPreference = 'Stop'

$root = git rev-parse --show-toplevel
if (-not $root) {
    throw 'Run this command inside the aulacys Git repository.'
}

$memberFile = Join-Path $root '.git\ai-log-member'
[System.IO.File]::WriteAllText($memberFile, "$Member`n", [System.Text.UTF8Encoding]::new($false))

Write-Host "[ai-log] Member configured: $Member" -ForegroundColor Green
Write-Host '[ai-log] Restart Cursor so the project hooks reload.'
