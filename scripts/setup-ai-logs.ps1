param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
        'nguyen-thanh-tai',
        'nguyen-thanh-toan',
        'hoang-kim-tuan-anh',
        'nguyen-minh-anh',
        'vu-huyen-dieu'
    )]
    [string]$Member,

    [string]$Tools = 'cursor'
)

$ErrorActionPreference = 'Stop'
$validTools = @('cursor', 'claude', 'codex', 'antigravity')
$selectedTools = @(
    $Tools.Split(',') |
        ForEach-Object { $_.Trim().ToLowerInvariant() } |
        Where-Object { $_ }
)
$invalidTools = @($selectedTools | Where-Object { $_ -notin $validTools })
if ($invalidTools.Count -gt 0) {
    throw "Unsupported AI tools: $($invalidTools -join ', ')"
}
if ($selectedTools.Count -eq 0) {
    throw 'Select at least one AI tool.'
}

$root = git rev-parse --show-toplevel
if (-not $root) {
    throw 'Run this command inside the aulacys Git repository.'
}

$memberFile = Join-Path $root '.git\ai-log-member'
$toolsFile = Join-Path $root '.git\ai-log-tools'
[System.IO.File]::WriteAllText($memberFile, "$Member`n", [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText(
    $toolsFile,
    (($selectedTools -join ',') + "`n"),
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "[ai-log] Member configured: $Member" -ForegroundColor Green
Write-Host "[ai-log] Tools enabled: $($selectedTools -join ', ')" -ForegroundColor Green

foreach ($tool in $selectedTools) {
    $toolRoot = Join-Path $root "ai-logs\$Member\$tool"
    New-Item -ItemType Directory -Force -Path (Join-Path $toolRoot 'sessions') | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $toolRoot 'screenshots') | Out-Null
}

& py -3 (Join-Path $PSScriptRoot 'export-ai-sessions.py') `
    --member $Member `
    --tools ($selectedTools -join ',')
if ($LASTEXITCODE -ne 0) {
    throw 'AI session export failed.'
}

Write-Host '[ai-log] Restart the selected desktop AI tools so project hooks reload.'
