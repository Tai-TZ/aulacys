#!/usr/bin/env bash
set -euo pipefail

# deploy-gcp-draft.sh - draft deploy to GCP Cloud Run + Artifact Registry
#
# Examples:
#   bash scripts/deploy-gcp-draft.sh --project-id aulacys --region asia-southeast1 --env-file .env.production --secrets-only
#   bash scripts/deploy-gcp-draft.sh --project-id aulacys --region asia-southeast1
#   bash scripts/deploy-gcp-draft.sh --project-id aulacys --region asia-east1 --cloud-sql-instance aulacys:asia-east1:aulacys

PROJECT_ID=""
REGION="asia-southeast1"
REPOSITORY="shb-draft"
TAG="draft"
WEB_ORIGIN=""
CLOUD_SQL_INSTANCE=""
ENV_FILE=""
SKIP_BUILD=0
SKIP_WEB=0
SKIP_SECRET_CHECK=0
PROMPT_SECRETS=0
SECRETS_ONLY=0
PRIVATE_SERVICES=0
DRY_RUN=0

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

REQUIRED_SECRET_NAMES=(
  "gemini-api-key"
  "orchestrator-database-url"
  "orchestrator-direct-url"
  "application-database-url"
  "application-direct-url"
  "audit-database-url"
  "audit-direct-url"
  "los-database-url"
  "los-direct-url"
)

REQUIRED_SECRET_ENVS=(
  "GEMINI_API_KEY"
  "ORCHESTRATOR_DATABASE_URL"
  "ORCHESTRATOR_DIRECT_URL"
  "APPLICATION_DATABASE_URL"
  "APPLICATION_DIRECT_URL"
  "AUDIT_DATABASE_URL"
  "AUDIT_DIRECT_URL"
  "LOS_DATABASE_URL"
  "LOS_DIRECT_URL"
)

usage() {
  cat <<'EOF'
Usage:
  bash scripts/deploy-gcp-draft.sh --project-id PROJECT [options]

Options:
  --project-id PROJECT          GCP project id, e.g. aulacys
  --region REGION              Cloud Run / Artifact Registry region (default: asia-southeast1)
  --repository NAME            Artifact Registry repo (default: shb-draft)
  --tag TAG                    Image tag (default: draft)
  --web-origin URL             Existing web origin when --skip-web is used
  --cloud-sql-instance NAME    Cloud SQL instance connection name; omit for Supabase
  --env-file PATH              Sync Secret Manager from .env.production-style file
  --skip-build                 Deploy using already-built images
  --skip-web                   Skip web image/deploy
  --skip-secret-check          Do not verify required Secret Manager secrets
  --prompt-secrets             Prompt for missing secrets in terminal
  --secrets-only               Stop after API enable + secret sync/check
  --private-services           Deploy Cloud Run services without unauthenticated access
  --dry-run                    Print commands without executing them
  -h, --help                   Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-id|-p) PROJECT_ID="${2:-}"; shift 2 ;;
    --region) REGION="${2:-}"; shift 2 ;;
    --repository) REPOSITORY="${2:-}"; shift 2 ;;
    --tag) TAG="${2:-}"; shift 2 ;;
    --web-origin) WEB_ORIGIN="${2:-}"; shift 2 ;;
    --cloud-sql-instance) CLOUD_SQL_INSTANCE="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --skip-web) SKIP_WEB=1; shift ;;
    --skip-secret-check) SKIP_SECRET_CHECK=1; shift ;;
    --prompt-secrets) PROMPT_SECRETS=1; shift ;;
    --secrets-only) SECRETS_ONLY=1; shift ;;
    --private-services) PRIVATE_SERVICES=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  echo "--project-id is required" >&2
  usage >&2
  exit 2
fi

IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
if [[ -n "${WEB_ORIGIN// }" ]]; then
  INITIAL_CORS_ORIGIN="${WEB_ORIGIN%/}"
else
  INITIAL_CORS_ORIGIN="https://pending-web-origin.invalid"
fi
if [[ "$PRIVATE_SERVICES" -eq 1 ]]; then
  AUTH_ARG="--no-allow-unauthenticated"
else
  AUTH_ARG="--allow-unauthenticated"
fi

log() {
  printf '\n\033[1;36m==> %s\033[0m\n' "$*"
}

run_gcloud() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] gcloud'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi
  printf 'gcloud'
  printf ' %q' "$@"
  printf '\n'
  gcloud "$@"
}

require_tool() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 not found on PATH" >&2
    exit 1
  fi
}

image() {
  printf '%s/%s:%s' "$IMAGE_BASE" "$1" "$TAG"
}

join_csv() {
  local IFS=,
  printf '%s' "$*"
}

write_cloudbuild_config() {
  local path="$1"
  local image_ref="$2"
  local dockerfile="$3"
  local context="$4"
  shift 4

  {
    printf -- 'steps:\n'
    printf -- '- name: gcr.io/cloud-builders/docker\n'
    printf -- '  args:\n'
    printf -- '  - build\n'
    printf -- '  - -f\n'
    printf -- '  - %s\n' "$dockerfile"
    while [[ $# -gt 0 ]]; do
      printf -- '  - --build-arg\n'
      printf -- '  - %s\n' "$1"
      shift
    done
    printf -- '  - -t\n'
    printf -- '  - %s\n' "$image_ref"
    printf -- '  - %s\n' "$context"
    printf -- 'images:\n'
    printf -- '- %s\n' "$image_ref"
  } > "$path"
}

build_image() {
  local name="$1"
  local dockerfile="$2"
  local context="$3"
  shift 3

  local image_ref
  image_ref="$(image "$name")"
  local config
  config="$(mktemp)"
  write_cloudbuild_config "$config" "$image_ref" "$dockerfile" "$context" "$@"
  run_gcloud builds submit "$ROOT" --config "$config" --project "$PROJECT_ID" --region "$REGION"
  rm -f "$config"
}

deploy_service() {
  local name="$1"
  local image_ref="$2"
  local port="$3"
  local env_csv="${4:-}"
  local secrets_csv="${5:-}"

  local args=(
    run deploy "$name"
    --image "$image_ref"
    --region "$REGION"
    --project "$PROJECT_ID"
    --port "$port"
    --quiet
    "$AUTH_ARG"
  )
  if [[ -n "${CLOUD_SQL_INSTANCE// }" ]]; then
    args+=(--add-cloudsql-instances "$CLOUD_SQL_INSTANCE")
  fi
  if [[ -n "$env_csv" ]]; then
    args+=(--set-env-vars "$env_csv")
  fi
  if [[ -n "$secrets_csv" ]]; then
    args+=(--update-secrets "$secrets_csv")
  fi
  run_gcloud "${args[@]}"
}

service_url() {
  local name="$1"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'https://%s-dry-run.run.app' "$name"
    return 0
  fi
  gcloud run services describe "$name" --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)' | sed 's:/*$::'
}

test_secret() {
  gcloud secrets describe "$1" --project "$PROJECT_ID" >/dev/null 2>&1
}

resolve_env_file() {
  local path="$1"
  if [[ -z "${path// }" ]]; then
    return 1
  fi
  if [[ "$path" = /* ]]; then
    [[ -f "$path" ]] || { echo "Env file not found: $path" >&2; exit 1; }
    printf '%s' "$path"
    return 0
  fi
  for candidate in "$ROOT/$path" "$SCRIPT_DIR/$path" "$PWD/$path"; do
    if [[ -f "$candidate" ]]; then
      (cd "$(dirname "$candidate")" && printf '%s/%s' "$PWD" "$(basename "$candidate")")
      return 0
    fi
  done
  echo "Env file not found: $path" >&2
  exit 1
}

declare -A ENV_VALUES=()

read_env_file() {
  local path="$1"
  local line key value
  ENV_VALUES=()
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
      key="${BASH_REMATCH[2]}"
      value="${BASH_REMATCH[3]}"
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%"${value##*[![:space:]]}"}"
      if [[ ( "$value" == \"*\" && "$value" == *\" ) || ( "$value" == \'*\' && "$value" == *\' ) ]]; then
        value="${value:1:${#value}-2}"
      fi
      ENV_VALUES["$key"]="$value"
    fi
  done < "$path"
}

set_secret() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Secret '$name' cannot be empty" >&2
    exit 1
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] set secret: %s\n' "$name"
    return 0
  fi
  if test_secret "$name"; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project "$PROJECT_ID" >/dev/null
    printf 'Updated secret: %s\n' "$name"
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=- --project "$PROJECT_ID" >/dev/null
    printf 'Created secret: %s\n' "$name"
  fi
}

sync_secrets_from_env_file() {
  local resolved
  resolved="$(resolve_env_file "$1")"
  log "Syncing Secret Manager from $resolved"
  read_env_file "$resolved"
  local i env_name secret_name
  for i in "${!REQUIRED_SECRET_NAMES[@]}"; do
    secret_name="${REQUIRED_SECRET_NAMES[$i]}"
    env_name="${REQUIRED_SECRET_ENVS[$i]}"
    if [[ -z "${ENV_VALUES[$env_name]:-}" ]]; then
      printf 'Skipping %s; not set in env file.\n' "$env_name"
      continue
    fi
    set_secret "$secret_name" "${ENV_VALUES[$env_name]}"
  done
}

assert_secret() {
  local name="$1"
  if [[ "$SKIP_SECRET_CHECK" -eq 1 || "$DRY_RUN" -eq 1 ]]; then
    return 0
  fi
  if ! test_secret "$name"; then
    return 1
  fi
}

read_secret_value() {
  local name="$1"
  local value
  read -r -s -p "Enter value for Secret Manager secret '$name': " value
  printf '\n' >&2
  printf '%s' "$value"
}

assert_required_secrets() {
  log "Checking required Secret Manager secrets"
  local secret value
  for secret in "${REQUIRED_SECRET_NAMES[@]}"; do
    if assert_secret "$secret"; then
      continue
    fi
    if [[ "$PROMPT_SECRETS" -ne 1 ]]; then
      echo "Missing Secret Manager secret: $secret. Re-run with --prompt-secrets or --env-file .env.production." >&2
      exit 1
    fi
    value="$(read_secret_value "$secret")"
    set_secret "$secret" "$value"
  done
  printf 'Secret check OK.\n'
}

ensure_artifact_repository() {
  log "Ensuring Artifact Registry repository"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] ensure artifact repo %s in %s\n' "$REPOSITORY" "$REGION"
    return 0
  fi
  if gcloud artifacts repositories describe "$REPOSITORY" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
    printf 'Artifact Registry repo exists: %s\n' "$REPOSITORY"
    return 0
  fi
  run_gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format docker \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --quiet
}

enable_gcp_apis() {
  log "Enabling GCP APIs"
  run_gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    --project "$PROJECT_ID"
}

deploy_stateless_services() {
  log "Deploying stateless leaf services"
  local item name port
  for item in \
    "policy-svc:8100" \
    "cic-svc:8300" \
    "aml-svc:8320" \
    "property-svc:8330" \
    "income-svc:8340" \
    "catalog-svc:8350" \
    "legal-svc:8370"; do
    name="${item%%:*}"
    port="${item##*:}"
    deploy_service "$name" "$(image "$name")" "$port"
  done
}

deploy_db_services() {
  log "Deploying DB-owning services"
  deploy_service "application-svc" "$(image application-svc)" 8360 \
    "DB_SCHEMA=application" \
    "DATABASE_URL=application-database-url:latest,DIRECT_URL=application-direct-url:latest"
  deploy_service "audit-svc" "$(image audit-svc)" 8200 \
    "DB_SCHEMA=audit" \
    "DATABASE_URL=audit-database-url:latest,DIRECT_URL=audit-direct-url:latest"
  deploy_service "los-svc" "$(image los-svc)" 8310 \
    "DB_SCHEMA=los" \
    "DATABASE_URL=los-database-url:latest,DIRECT_URL=los-direct-url:latest"
}

declare -A URLS=()

read_deployed_urls() {
  # Only services already deployed before agent workers.
  local name
  for name in \
    policy-svc cic-svc aml-svc property-svc income-svc catalog-svc legal-svc \
    application-svc audit-svc los-svc; do
    URLS["$name"]="$(service_url "$name")"
  done
}

deploy_agent_workers() {
  log "Deploying agent workers"
  deploy_service "credit-svc" "$(image agent-worker-svc)" 8400 \
    "AGENT_NAME=credit,CIC_SVC_URL=${URLS[cic-svc]},INCOME_SVC_URL=${URLS[income-svc]}"
  deploy_service "operations-svc" "$(image agent-worker-svc)" 8400 \
    "AGENT_NAME=operations,PROPERTY_SVC_URL=${URLS[property-svc]}"
  deploy_service "compliance-svc" "$(image agent-worker-svc)" 8400 \
    "AGENT_NAME=compliance,AML_SVC_URL=${URLS[aml-svc]},POLICY_SVC_URL=${URLS[policy-svc]}"
  deploy_service "critic-svc" "$(image agent-worker-svc)" 8400 \
    "AGENT_NAME=critic"
}

build_backend_images() {
  log "Building backend images"
  local name
  for name in \
    policy-svc cic-svc aml-svc property-svc income-svc catalog-svc legal-svc \
    application-svc audit-svc los-svc api-gateway; do
    build_image "$name" "services/$name/Dockerfile" "services/$name"
  done
  build_image "agent-worker-svc" "services/agent-worker-svc/Dockerfile" "."
  build_image "orchestrator-svc" "services/orchestrator-svc/Dockerfile" "."
}

build_web_image() {
  if [[ "$SKIP_WEB" -eq 1 ]]; then
    return 0
  fi
  log "Building web image"
  build_image "web" "apps/web/Dockerfile" "apps/web" \
    "NEXT_PUBLIC_API_URL=${URLS[orchestrator-svc]}" \
    "NEXT_PUBLIC_GATEWAY_URL=${URLS[api-gateway]}" \
    "NEXT_PUBLIC_APPLICATION_SVC_URL=${URLS[application-svc]}"
}

deploy_orchestrator_and_gateway() {
  log "Deploying orchestrator"
  deploy_service "orchestrator-svc" "$(image orchestrator-svc)" 8000 \
    "$(join_csv \
      "AML_SVC_URL=${URLS[aml-svc]}" \
      "APP_ENV=production" \
      "APPLICATION_SVC_URL=${URLS[application-svc]}" \
      "AUDIT_SVC_URL=${URLS[audit-svc]}" \
      "CIC_SVC_URL=${URLS[cic-svc]}" \
      "COMPLIANCE_AGENT_URL=${URLS[compliance-svc]}" \
      "CORS_ORIGINS=$INITIAL_CORS_ORIGIN" \
      "CREDIT_AGENT_URL=${URLS[credit-svc]}" \
      "CRITIC_AGENT_URL=${URLS[critic-svc]}" \
      "DB_SCHEMA=orchestrator" \
      "INCOME_SVC_URL=${URLS[income-svc]}" \
      "LEGAL_SVC_URL=${URLS[legal-svc]}" \
      "LLM_PROVIDER=gemini" \
      "LOS_SVC_URL=${URLS[los-svc]}" \
      "OPERATIONS_AGENT_URL=${URLS[operations-svc]}" \
      "POLICY_SVC_URL=${URLS[policy-svc]}" \
      "PROPERTY_SVC_URL=${URLS[property-svc]}")" \
    "DATABASE_URL=orchestrator-database-url:latest,DIRECT_URL=orchestrator-direct-url:latest,GEMINI_API_KEY=gemini-api-key:latest"
  URLS["orchestrator-svc"]="$(service_url orchestrator-svc)"

  log "Deploying API gateway"
  deploy_service "api-gateway" "$(image api-gateway)" 8080 \
    "$(join_csv \
      "AML_SVC_URL=${URLS[aml-svc]}" \
      "APPLICATION_SVC_URL=${URLS[application-svc]}" \
      "AUDIT_SVC_URL=${URLS[audit-svc]}" \
      "CATALOG_SVC_URL=${URLS[catalog-svc]}" \
      "CIC_SVC_URL=${URLS[cic-svc]}" \
      "COMPLIANCE_AGENT_URL=${URLS[compliance-svc]}" \
      "CORS_ORIGINS=$INITIAL_CORS_ORIGIN" \
      "CREDIT_AGENT_URL=${URLS[credit-svc]}" \
      "CRITIC_AGENT_URL=${URLS[critic-svc]}" \
      "INCOME_SVC_URL=${URLS[income-svc]}" \
      "LEGAL_SVC_URL=${URLS[legal-svc]}" \
      "LOS_SVC_URL=${URLS[los-svc]}" \
      "MONOLITH_URL=${URLS[orchestrator-svc]}" \
      "OPERATIONS_AGENT_URL=${URLS[operations-svc]}" \
      "POLICY_SVC_URL=${URLS[policy-svc]}" \
      "PROPERTY_SVC_URL=${URLS[property-svc]}")"
  URLS["api-gateway"]="$(service_url api-gateway)"
}

update_cors() {
  local origin="$1"
  log "Updating CORS origin to $origin"
  run_gcloud run services update orchestrator-svc \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --update-env-vars "CORS_ORIGINS=$origin" \
    --quiet
  run_gcloud run services update api-gateway \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --update-env-vars "CORS_ORIGINS=$origin" \
    --quiet
}

deploy_web_and_cors() {
  if [[ "$SKIP_WEB" -eq 1 ]]; then
    if [[ -z "${WEB_ORIGIN// }" ]]; then
      printf 'Skipped web deploy. CORS remains %s.\n' "$INITIAL_CORS_ORIGIN"
      return 0
    fi
    update_cors "${WEB_ORIGIN%/}"
    return 0
  fi

  log "Deploying web"
  deploy_service "web" "$(image web)" 3000
  URLS["web"]="$(service_url web)"
  local origin="$WEB_ORIGIN"
  if [[ -z "${origin// }" ]]; then
    origin="${URLS[web]}"
  else
    origin="${origin%/}"
  fi
  update_cors "$origin"
}

verify_deploy() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] skip HTTP verification\n'
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    printf 'curl not found; skip HTTP verification\n'
    return 0
  fi
  log "Verifying deployed draft"
  curl -fsS "${URLS[orchestrator-svc]}/health" >/dev/null
  printf 'orchestrator /health: OK\n'
  curl -fsS "${URLS[api-gateway]}/status" >/dev/null
  printf 'gateway /status: OK\n'
}

preflight() {
  log "Preflight"
  require_tool gcloud
  if [[ ! -f "$ROOT/services/orchestrator-svc/Dockerfile" ]]; then
    echo "Missing services/orchestrator-svc/Dockerfile" >&2
    exit 1
  fi
  printf 'Preflight OK.\n'
}

main() {
  cd "$ROOT"
  preflight
  enable_gcp_apis
  if [[ -n "${ENV_FILE// }" ]]; then
    sync_secrets_from_env_file "$ENV_FILE"
  fi
  assert_required_secrets

  if [[ "$SECRETS_ONLY" -eq 1 ]]; then
    log "Secrets ready"
    printf 'All required Secret Manager secrets exist. Re-run without --secrets-only to build and deploy.\n'
    return 0
  fi

  ensure_artifact_repository

  if [[ "$SKIP_BUILD" -ne 1 ]]; then
    build_backend_images
  fi

  deploy_stateless_services
  deploy_db_services

  read_deployed_urls
  deploy_agent_workers
  URLS["credit-svc"]="$(service_url credit-svc)"
  URLS["operations-svc"]="$(service_url operations-svc)"
  URLS["compliance-svc"]="$(service_url compliance-svc)"
  URLS["critic-svc"]="$(service_url critic-svc)"

  deploy_orchestrator_and_gateway

  if [[ "$SKIP_BUILD" -ne 1 ]]; then
    build_web_image
  fi
  deploy_web_and_cors
  if [[ "$SKIP_WEB" -ne 1 ]]; then
    URLS["web"]="$(service_url web)"
  fi

  verify_deploy

  log "Draft URLs"
  local key
  for key in $(printf '%s\n' "${!URLS[@]}" | sort); do
    printf '%-20s %s\n' "$key" "${URLS[$key]}"
  done
}

main "$@"
