# Handoff — Postgres-only audit/los (no SQLite)

- **Date:** 2026-07-18
- **Author:** agent
- **Status:** ✅ Done

## What changed & why

Team decision: drop SQLite dual-store. Align with `docs/CONFIG.md` + schema-per-service Supabase.

- Removed `sqlite_*` repos, `AUDIT_DB` / `LOS_DB`
- `DATABASE_URL` **required** (Postgres); `DB_SCHEMA` defaults `audit` / `los`
- Compose: `postgres` service + `init-schemas.sql`; audit/los get `DATABASE_URL` with `search_path`
- Tests skip if Postgres unreachable

## Verify

```bash
docker compose -f docker-compose.services.yml up -d postgres
cd services/audit-svc
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres?options=-csearch_path%3Daudit"
pytest -q
cd ../los-svc
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres?options=-csearch_path%3Dlos"
pytest -q
```

## Contract impact
none (HTTP same; storage backend only).
