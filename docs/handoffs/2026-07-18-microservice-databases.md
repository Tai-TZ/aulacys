# Handoff — Microservice Databases

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `codex/fix-dag-execution-order`
- **Status:** ✅ Done

## What changed & why
Prepared the database layer for a full-microservice runtime. `orchestrator-svc` now has its own Postgres schema/migration scaffold for workflow run state, and the shared DB bootstrap knows how to create/verify all DB-owning service schemas. Also restored the missing `application-svc` `0002_application_document` migration so the repo matches the existing DB revision, and fixed audit/LOS Alembic search-path handling so tables land in their service schemas instead of `public`.

## Files touched
- `services/orchestrator-svc/**` — new DB scaffold: config, ORM models, Alembic, schema snapshot, env example, README.
- `services/db/bootstrap.py` — creates/verifies `orchestrator`, `application`, `los`, `audit`; injects schema-aware env for services without `.env`; repairs old schema drift from `schema.sql`.
- `services/audit-svc/migrations/env.py` and `services/los-svc/migrations/env.py` — create schema + set `search_path` before migration.
- `services/application-svc/migrations/versions/0002_application_document.py` — restored missing migration revision.
- `services/application-svc/app/db/models.py` and `schema.sql` — added `ApplicationDocument`.
- `docs/GCP-DATABASES.md` — Cloud SQL / Secret Manager mapping for DB-owning services.
- `services/README.md` — documents `orchestrator-svc` DB scaffold and persistence ownership.

## How to run / verify
```bash
python -m ruff check services/db/bootstrap.py services/audit-svc/migrations/env.py services/los-svc/migrations/env.py services/application-svc services/orchestrator-svc
python -m ruff format --check services/db/bootstrap.py services/audit-svc/migrations/env.py services/los-svc/migrations/env.py services/application-svc services/orchestrator-svc
python -m compileall services/application-svc services/orchestrator-svc services/db/bootstrap.py services/audit-svc/migrations/env.py services/los-svc/migrations/env.py
python services/db/bootstrap.py
python services/db/bootstrap.py --verify
```
Expected result: ruff passes, compile succeeds, bootstrap verify prints `RESULT: ready`.

## Contract impact
No `apps/api/src/models/schemas.py` or `apps/web/lib/api.ts` change. This is service DB infrastructure only.

## Follow-ups / TODO
- [ ] Wire `orchestrator-svc` runtime API to persist graph runs into the new tables.
- [ ] Add CI job to run `alembic upgrade head` for DB-owning services before Cloud Run deploy.
- [ ] Decide whether `catalog-svc` stays seed-backed or becomes DB-backed for product admin.

## Gotchas
The local DB had `audit`/`los` Alembic versions in service schemas but tables in `public`; bootstrap now repairs that idempotently from `schema.sql`. Do not let services read each other's schemas directly: cross-service data access should stay HTTP only.
