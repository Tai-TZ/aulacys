# =============================================================================
# deploy-gcp-draft.ps1 - draft deploy to GCP Cloud Run + Artifact Registry
# =============================================================================
#
# Example:
#   .\scripts\deploy-gcp-draft.ps1 -ProjectId my-gcp-project -Region asia-southeast1
#   .\scripts\deploy-gcp-draft.ps1 -ProjectId my-gcp-project -Region asia-east1 -CloudSqlInstance my-project:asia-east1:my-instance
#   .\scripts\deploy-gcp-draft.ps1 -ProjectId my-gcp-project -DryRun
#   .\scripts\deploy-gcp-draft.ps1 -ProjectId my-gcp-project -PromptSecrets -SecretsOnly
#   .\scripts\deploy-gcp-draft.ps1 -ProjectId my-gcp-project -EnvFile .env.production -SecretsOnly
#
# Expected pre-created secrets:
#   gemini-api-key
#   orchestrator-database-url, orchestrator-direct-url
#   application-database-url, application-direct-url
#   audit-database-url, audit-direct-url
#   los-database-url, los-direct-url
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [string]$Region = "asia-southeast1",

    [string]$Repository = "shb-draft",

    [string]$Tag = "draft",

    [string]$WebOrigin = "",

    [string]$CloudSqlInstance = "",

    [string]$EnvFile = "",

    [switch]$SkipBuild,

    [switch]$SkipWeb,

    [switch]$SkipSecretCheck,

    [switch]$PromptSecrets,

    [switch]$SecretsOnly,

    [switch]$PrivateServices,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ImageBase = "$Region-docker.pkg.dev/$ProjectId/$Repository"
$InitialCorsOrigin = if ($WebOrigin.Trim()) { $WebOrigin.TrimEnd("/") } else { "https://pending-web-origin.invalid" }
$AuthArgs = if ($PrivateServices) { @("--no-allow-unauthenticated") } else { @("--allow-unauthenticated") }
$RequiredSecrets = @(
    @{ Secret = "gemini-api-key"; Env = "GEMINI_API_KEY" },
    @{ Secret = "orchestrator-database-url"; Env = "ORCHESTRATOR_DATABASE_URL" },
    @{ Secret = "orchestrator-direct-url"; Env = "ORCHESTRATOR_DIRECT_URL" },
    @{ Secret = "application-database-url"; Env = "APPLICATION_DATABASE_URL" },
    @{ Secret = "application-direct-url"; Env = "APPLICATION_DIRECT_URL" },
    @{ Secret = "audit-database-url"; Env = "AUDIT_DATABASE_URL" },
    @{ Secret = "audit-direct-url"; Env = "AUDIT_DIRECT_URL" },
    @{ Secret = "los-database-url"; Env = "LOS_DATABASE_URL" },
    @{ Secret = "los-direct-url"; Env = "LOS_DIRECT_URL" }
)

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Checked {
    param([string[]]$GcloudArgs)
    $printable = "gcloud " + ($GcloudArgs -join " ")
    if ($DryRun) {
        Write-Host "[dry-run] $printable" -ForegroundColor DarkYellow
        return ""
    }
    Write-Host $printable -ForegroundColor DarkGray
    & gcloud @GcloudArgs
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud command failed: $printable"
    }
}

function Assert-Tool([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name not found on PATH"
    }
}

function Get-Image([string]$Name) {
    return "$ImageBase/$Name`:$Tag"
}

function New-CloudBuildConfig {
    param(
        [string]$Image,
        [string]$Dockerfile,
        [string]$Context,
        [string[]]$BuildArgs = @()
    )
    $args = @("build", "-f", $Dockerfile)
    foreach ($item in $BuildArgs) {
        $args += @("--build-arg", $item)
    }
    $args += @("-t", $Image, $Context)
    $config = @{
        steps = @(
            @{
                name = "gcr.io/cloud-builders/docker"
                args = $args
            }
        )
        images = @($Image)
    }
    $path = Join-Path ([System.IO.Path]::GetTempPath()) ("cloudbuild-" + [Guid]::NewGuid().ToString("N") + ".json")
    $config | ConvertTo-Json -Depth 8 | Set-Content -Path $path -Encoding ascii
    return $path
}

function Invoke-BuildImage {
    param(
        [string]$Name,
        [string]$Dockerfile,
        [string]$Context,
        [string[]]$BuildArgs = @()
    )
    $image = Get-Image $Name
    $config = New-CloudBuildConfig -Image $image -Dockerfile $Dockerfile -Context $Context -BuildArgs $BuildArgs
    try {
        Invoke-Checked -GcloudArgs @("builds", "submit", $Root, "--config", $config, "--project", $ProjectId, "--region", $Region)
    }
    finally {
        if (Test-Path $config) {
            Remove-Item -LiteralPath $config -Force
        }
    }
}

function Deploy-Service {
    param(
        [string]$Name,
        [string]$Image,
        [int]$Port,
        [hashtable]$Env = @{},
        [hashtable]$Secrets = @{}
    )
    $args = @(
        "run", "deploy", $Name,
        "--image", $Image,
        "--region", $Region,
        "--project", $ProjectId,
        "--port", [string]$Port,
        "--quiet"
    ) + $AuthArgs

    if ($CloudSqlInstance.Trim()) {
        $args += @("--add-cloudsql-instances", $CloudSqlInstance.Trim())
    }

    if ($Env.Count -gt 0) {
        $envPairs = @()
        foreach ($key in ($Env.Keys | Sort-Object)) {
            $envPairs += "$key=$($Env[$key])"
        }
        $args += @("--set-env-vars", ($envPairs -join ","))
    }

    if ($Secrets.Count -gt 0) {
        $secretPairs = @()
        foreach ($key in ($Secrets.Keys | Sort-Object)) {
            $secretPairs += "$key=$($Secrets[$key]):latest"
        }
        $args += @("--update-secrets", ($secretPairs -join ","))
    }

    Invoke-Checked -GcloudArgs $args
}

function Get-ServiceUrl([string]$Name) {
    if ($DryRun) {
        return "https://$Name-dry-run.run.app"
    }
    $url = & gcloud run services describe $Name --region $Region --project $ProjectId --format "value(status.url)"
    if ($LASTEXITCODE -ne 0 -or -not $url) {
        throw "Cannot read Cloud Run URL for $Name"
    }
    return $url.TrimEnd("/")
}

function Test-GcpSecret([string]$Name) {
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & gcloud secrets describe $Name --project $ProjectId *> $null
        return ($LASTEXITCODE -eq 0)
    }
    finally {
        $ErrorActionPreference = $oldPreference
    }
}

function Resolve-EnvFilePath([string]$Path) {
    if (-not $Path.Trim()) {
        return ""
    }
    if ([System.IO.Path]::IsPathRooted($Path)) {
        if (-not (Test-Path -LiteralPath $Path)) {
            throw "Env file not found: $Path"
        }
        return (Resolve-Path -LiteralPath $Path).Path
    }

    foreach ($candidate in @(
            (Join-Path $Root $Path),
            (Join-Path $PSScriptRoot $Path),
            (Join-Path (Get-Location) $Path)
        )) {
        if (Test-Path -LiteralPath $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }
    throw "Env file not found: $Path"
}

function Read-EnvFile([string]$Path) {
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }
        if ($trimmed -notmatch '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            continue
        }

        $key = $Matches[1]
        $value = $Matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $values[$key] = $value
    }
    return $values
}

function Sync-SecretsFromEnvFile([string]$Path) {
    $resolved = Resolve-EnvFilePath $Path
    Write-Step "Syncing Secret Manager from $resolved"
    $values = Read-EnvFile $resolved
    foreach ($item in $RequiredSecrets) {
        $envName = $item.Env
        if (-not $values.ContainsKey($envName) -or -not $values[$envName]) {
            Write-Host "Skipping $envName; not set in env file." -ForegroundColor Yellow
            continue
        }
        Set-GcpSecret -Name $item.Secret -Value $values[$envName]
    }
}

function Assert-Secret([string]$Name) {
    if ($SkipSecretCheck -or $DryRun) {
        return
    }
    if (-not (Test-GcpSecret $Name)) {
        throw "Missing Secret Manager secret: $Name. Re-run with -PromptSecrets to enter it in this terminal."
    }
}

function Read-SecretValue([string]$Name) {
    $secure = Read-Host "Enter value for Secret Manager secret '$Name'" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    }
    finally {
        if ($bstr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
}

function Set-GcpSecret {
    param(
        [string]$Name,
        [string]$Value
    )
    if (-not $Value) {
        throw "Secret '$Name' cannot be empty"
    }
    if ($DryRun) {
        Write-Host "[dry-run] set secret: $Name" -ForegroundColor DarkYellow
        return
    }

    $gcloudSecretWriter = if (Get-Command "gcloud.cmd" -ErrorAction SilentlyContinue) { "gcloud.cmd" } else { "gcloud" }
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    if (-not (Test-GcpSecret $Name)) {
        try {
            $Value | & $gcloudSecretWriter secrets create $Name --data-file=- --project $ProjectId *> $null
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to create Secret Manager secret: $Name"
            }
        }
        finally {
            $ErrorActionPreference = $oldPreference
        }
        Write-Host "Created secret: $Name" -ForegroundColor Green
        return
    }

    try {
        $Value | & $gcloudSecretWriter secrets versions add $Name --data-file=- --project $ProjectId *> $null
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to add new secret version: $Name"
        }
    }
    finally {
        $ErrorActionPreference = $oldPreference
    }
    Write-Host "Updated secret: $Name" -ForegroundColor Green
}

function Ensure-ArtifactRepository {
    Write-Step "Ensuring Artifact Registry repository"
    if ($DryRun) {
        Write-Host "[dry-run] ensure artifact repo $Repository in $Region" -ForegroundColor DarkYellow
        return
    }
    & gcloud artifacts repositories describe $Repository --location $Region --project $ProjectId *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Artifact Registry repo exists: $Repository" -ForegroundColor Green
        return
    }
    Invoke-Checked -GcloudArgs @(
        "artifacts", "repositories", "create", $Repository,
        "--repository-format", "docker",
        "--location", $Region,
        "--project", $ProjectId,
        "--quiet"
    )
}

function Enable-GcpApis {
    Write-Step "Enabling GCP APIs"
    Invoke-Checked -GcloudArgs @(
        "services", "enable",
        "run.googleapis.com",
        "cloudbuild.googleapis.com",
        "artifactregistry.googleapis.com",
        "secretmanager.googleapis.com",
        "--project", $ProjectId
    )
}

function Deploy-StatelessServices {
    Write-Step "Deploying stateless leaf services"
    $services = @(
        @{ Name = "policy-svc"; Port = 8100 },
        @{ Name = "cic-svc"; Port = 8300 },
        @{ Name = "aml-svc"; Port = 8320 },
        @{ Name = "property-svc"; Port = 8330 },
        @{ Name = "income-svc"; Port = 8340 },
        @{ Name = "catalog-svc"; Port = 8350 },
        @{ Name = "legal-svc"; Port = 8370 }
    )
    foreach ($svc in $services) {
        Deploy-Service -Name $svc.Name -Image (Get-Image $svc.Name) -Port $svc.Port
    }
}

function Deploy-DbServices {
    Write-Step "Deploying DB-owning services"
    Deploy-Service -Name "application-svc" -Image (Get-Image "application-svc") -Port 8360 `
        -Env @{ DB_SCHEMA = "application" } `
        -Secrets @{ DATABASE_URL = "application-database-url"; DIRECT_URL = "application-direct-url" }

    Deploy-Service -Name "audit-svc" -Image (Get-Image "audit-svc") -Port 8200 `
        -Env @{ DB_SCHEMA = "audit" } `
        -Secrets @{ DATABASE_URL = "audit-database-url"; DIRECT_URL = "audit-direct-url" }

    Deploy-Service -Name "los-svc" -Image (Get-Image "los-svc") -Port 8310 `
        -Env @{ DB_SCHEMA = "los" } `
        -Secrets @{ DATABASE_URL = "los-database-url"; DIRECT_URL = "los-direct-url" }
}

function Deploy-AgentWorkers {
    param([hashtable]$Urls)
    Write-Step "Deploying agent workers"
    Deploy-Service -Name "credit-svc" -Image (Get-Image "agent-worker-svc") -Port 8400 `
        -Env @{ AGENT_NAME = "credit"; CIC_SVC_URL = $Urls["cic-svc"]; INCOME_SVC_URL = $Urls["income-svc"] }

    Deploy-Service -Name "operations-svc" -Image (Get-Image "agent-worker-svc") -Port 8400 `
        -Env @{ AGENT_NAME = "operations"; PROPERTY_SVC_URL = $Urls["property-svc"] }

    Deploy-Service -Name "compliance-svc" -Image (Get-Image "agent-worker-svc") -Port 8400 `
        -Env @{ AGENT_NAME = "compliance"; AML_SVC_URL = $Urls["aml-svc"]; POLICY_SVC_URL = $Urls["policy-svc"] }

    Deploy-Service -Name "critic-svc" -Image (Get-Image "agent-worker-svc") -Port 8400 `
        -Env @{ AGENT_NAME = "critic" }
}

function Build-BackendImages {
    Write-Step "Building backend images"
    $simple = @(
        "policy-svc",
        "cic-svc",
        "aml-svc",
        "property-svc",
        "income-svc",
        "catalog-svc",
        "legal-svc",
        "application-svc",
        "audit-svc",
        "los-svc",
        "api-gateway"
    )
    foreach ($name in $simple) {
        Invoke-BuildImage -Name $name -Dockerfile "services/$name/Dockerfile" -Context "services/$name"
    }
    Invoke-BuildImage -Name "agent-worker-svc" -Dockerfile "services/agent-worker-svc/Dockerfile" -Context "."
    Invoke-BuildImage -Name "orchestrator-svc" -Dockerfile "services/orchestrator-svc/Dockerfile" -Context "."
}

function Build-WebImage {
    param([hashtable]$Urls)
    if ($SkipWeb) {
        return
    }
    Write-Step "Building web image"
    Invoke-BuildImage -Name "web" -Dockerfile "apps/web/Dockerfile" -Context "apps/web" -BuildArgs @(
        "NEXT_PUBLIC_API_URL=$($Urls["orchestrator-svc"])",
        "NEXT_PUBLIC_GATEWAY_URL=$($Urls["api-gateway"])",
        "NEXT_PUBLIC_APPLICATION_SVC_URL=$($Urls["application-svc"])"
    )
}

function Deploy-OrchestratorAndGateway {
    param([hashtable]$Urls)
    Write-Step "Deploying orchestrator"
    Deploy-Service -Name "orchestrator-svc" -Image (Get-Image "orchestrator-svc") -Port 8000 `
        -Env @{
            APP_ENV = "production"
            LLM_PROVIDER = "gemini"
            DB_SCHEMA = "orchestrator"
            CORS_ORIGINS = $InitialCorsOrigin
            POLICY_SVC_URL = $Urls["policy-svc"]
            AUDIT_SVC_URL = $Urls["audit-svc"]
            CIC_SVC_URL = $Urls["cic-svc"]
            LOS_SVC_URL = $Urls["los-svc"]
            AML_SVC_URL = $Urls["aml-svc"]
            PROPERTY_SVC_URL = $Urls["property-svc"]
            INCOME_SVC_URL = $Urls["income-svc"]
            APPLICATION_SVC_URL = $Urls["application-svc"]
            LEGAL_SVC_URL = $Urls["legal-svc"]
            CREDIT_AGENT_URL = $Urls["credit-svc"]
            OPERATIONS_AGENT_URL = $Urls["operations-svc"]
            COMPLIANCE_AGENT_URL = $Urls["compliance-svc"]
            CRITIC_AGENT_URL = $Urls["critic-svc"]
        } `
        -Secrets @{
            GEMINI_API_KEY = "gemini-api-key"
            DATABASE_URL = "orchestrator-database-url"
            DIRECT_URL = "orchestrator-direct-url"
        }
    $Urls["orchestrator-svc"] = Get-ServiceUrl "orchestrator-svc"

    Write-Step "Deploying API gateway"
    Deploy-Service -Name "api-gateway" -Image (Get-Image "api-gateway") -Port 8080 `
        -Env @{
            MONOLITH_URL = $Urls["orchestrator-svc"]
            CORS_ORIGINS = $InitialCorsOrigin
            POLICY_SVC_URL = $Urls["policy-svc"]
            AUDIT_SVC_URL = $Urls["audit-svc"]
            CIC_SVC_URL = $Urls["cic-svc"]
            LOS_SVC_URL = $Urls["los-svc"]
            AML_SVC_URL = $Urls["aml-svc"]
            PROPERTY_SVC_URL = $Urls["property-svc"]
            INCOME_SVC_URL = $Urls["income-svc"]
            CATALOG_SVC_URL = $Urls["catalog-svc"]
            APPLICATION_SVC_URL = $Urls["application-svc"]
            LEGAL_SVC_URL = $Urls["legal-svc"]
            CREDIT_AGENT_URL = $Urls["credit-svc"]
            OPERATIONS_AGENT_URL = $Urls["operations-svc"]
            COMPLIANCE_AGENT_URL = $Urls["compliance-svc"]
            CRITIC_AGENT_URL = $Urls["critic-svc"]
        }
    $Urls["api-gateway"] = Get-ServiceUrl "api-gateway"
}

function Deploy-WebAndCors {
    param([hashtable]$Urls)
    if ($SkipWeb) {
        if (-not $WebOrigin.Trim()) {
            Write-Host "Skipped web deploy. CORS remains $InitialCorsOrigin." -ForegroundColor Yellow
            return
        }
        Update-Cors -Origin $WebOrigin.TrimEnd("/")
        return
    }

    Write-Step "Deploying web"
    Deploy-Service -Name "web" -Image (Get-Image "web") -Port 3000
    $Urls["web"] = Get-ServiceUrl "web"
    $origin = if ($WebOrigin.Trim()) { $WebOrigin.TrimEnd("/") } else { $Urls["web"] }
    Update-Cors -Origin $origin
}

function Update-Cors([string]$Origin) {
    Write-Step "Updating CORS origin to $Origin"
    Invoke-Checked -GcloudArgs @(
        "run", "services", "update", "orchestrator-svc",
        "--region", $Region,
        "--project", $ProjectId,
        "--update-env-vars", "CORS_ORIGINS=$Origin",
        "--quiet"
    )
    Invoke-Checked -GcloudArgs @(
        "run", "services", "update", "api-gateway",
        "--region", $Region,
        "--project", $ProjectId,
        "--update-env-vars", "CORS_ORIGINS=$Origin",
        "--quiet"
    )
}

function Read-DeployedUrls {
    $names = @(
        "policy-svc",
        "cic-svc",
        "aml-svc",
        "property-svc",
        "income-svc",
        "catalog-svc",
        "legal-svc",
        "application-svc",
        "audit-svc",
        "los-svc",
        "credit-svc",
        "operations-svc",
        "compliance-svc",
        "critic-svc"
    )
    $urls = @{}
    foreach ($name in $names) {
        $urls[$name] = Get-ServiceUrl $name
    }
    return $urls
}

function Invoke-Verify {
    param([hashtable]$Urls)
    if ($DryRun) {
        Write-Host "[dry-run] skip HTTP verification" -ForegroundColor DarkYellow
        return
    }
    Write-Step "Verifying deployed draft"
    $health = Invoke-RestMethod -Uri "$($Urls["orchestrator-svc"])/health" -TimeoutSec 20
    Write-Host "orchestrator /health: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
    $gateway = Invoke-RestMethod -Uri "$($Urls["api-gateway"])/status" -TimeoutSec 30
    Write-Host "gateway /status: status=$($gateway.status), up=$($gateway.summary.up), down=$($gateway.summary.down)" -ForegroundColor Green
}

function Assert-Preflight {
    Write-Step "Preflight"
    Assert-Tool "gcloud"
    if (-not (Test-Path (Join-Path $Root "services\orchestrator-svc\Dockerfile"))) {
        throw "Missing services\orchestrator-svc\Dockerfile"
    }
    Write-Host "Preflight OK." -ForegroundColor Green
}

function Assert-RequiredSecrets {
    Write-Step "Checking required Secret Manager secrets"
    foreach ($item in $RequiredSecrets) {
        $secret = $item.Secret
        try {
            Assert-Secret $secret
        }
        catch {
            if (-not $PromptSecrets) {
                throw
            }
            $value = Read-SecretValue $secret
            Set-GcpSecret -Name $secret -Value $value
        }
    }
    Write-Host "Secret check OK." -ForegroundColor Green
}

Push-Location $Root
try {
    Assert-Preflight
    Enable-GcpApis
    if ($EnvFile.Trim()) {
        Sync-SecretsFromEnvFile -Path $EnvFile
    }
    Assert-RequiredSecrets

    if ($SecretsOnly) {
        Write-Step "Secrets ready"
        Write-Host "All required Secret Manager secrets exist. Re-run without -SecretsOnly to build and deploy." -ForegroundColor Green
        return
    }

    Ensure-ArtifactRepository

    if (-not $SkipBuild) {
        Build-BackendImages
    }

    Deploy-StatelessServices
    Deploy-DbServices

    $urls = Read-DeployedUrls
    Deploy-AgentWorkers -Urls $urls
    foreach ($name in @("credit-svc", "operations-svc", "compliance-svc", "critic-svc")) {
        $urls[$name] = Get-ServiceUrl $name
    }

    Deploy-OrchestratorAndGateway -Urls $urls

    if (-not $SkipBuild) {
        Build-WebImage -Urls $urls
    }
    Deploy-WebAndCors -Urls $urls
    if (-not $SkipWeb) {
        $urls["web"] = Get-ServiceUrl "web"
    }

    Invoke-Verify -Urls $urls

    Write-Step "Draft URLs"
    foreach ($key in ($urls.Keys | Sort-Object)) {
        Write-Host ("{0,-20} {1}" -f $key, $urls[$key])
    }
}
finally {
    Pop-Location
}
