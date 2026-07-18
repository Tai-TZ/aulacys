#!/usr/bin/env bash
# Run Postgres-backed tests for audit-svc · los-svc · application-svc.
# Skips become failures (REQUIRE_DB=1).
#
#   ./scripts/test-db.sh           # start db if needed, then pytest
#   ./scripts/test-db.sh --no-up   # assume Postgres already on :5432
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NO_UP=0
for arg in "$@"; do
  case "$arg" in
    --no-up) NO_UP=1 ;;
    -h|--help)
      echo "Usage: $0 [--no-up]"
      exit 0
      ;;
  esac
done

if [[ "$NO_UP" -eq 0 ]]; then
  echo "==> Starting test Postgres (docker-compose.db.yml)"
  docker compose -f docker-compose.db.yml up -d --wait
fi

export REQUIRE_DB=1
# Base URL without search_path — each service fixture sets its schema.
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres?connect_timeout=3}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

SERVICES=(audit-svc los-svc application-svc)
FAILED=0
for svc in "${SERVICES[@]}"; do
  echo ""
  echo "==> pytest services/${svc}"
  (
    cd "services/${svc}"
    python -m pip install -q -r requirements.txt
    # Per-service search_path so create_all / queries hit the right schema
    case "$svc" in
      audit-svc) export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres?options=-csearch_path%3Daudit&connect_timeout=3" ;;
      los-svc) export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres?options=-csearch_path%3Dlos&connect_timeout=3" ;;
      application-svc) export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres?options=-csearch_path%3Dapplication&connect_timeout=3" ;;
    esac
    export DIRECT_URL="$DATABASE_URL"
    export DB_SCHEMA="${svc%-svc}"
    [[ "$svc" == "application-svc" ]] && export DB_SCHEMA=application
    [[ "$svc" == "audit-svc" ]] && export DB_SCHEMA=audit
    [[ "$svc" == "los-svc" ]] && export DB_SCHEMA=los
    python -m pytest -q --tb=short
  ) || FAILED=1
done

if [[ "$FAILED" -ne 0 ]]; then
  echo ""
  echo "test-db FAILED"
  exit 1
fi
echo ""
echo "test-db OK (audit + los + application)"
