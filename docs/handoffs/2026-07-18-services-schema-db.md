# Handoff — service schemas + DB dual-backend + layering

- **Date:** 2026-07-18
- **Author:** agent
- **Branch / PR:** local (uncommitted)
- **Status:** ✅ Done

## What changed & why

Backend hardening per `SERVICE-CODING-PLAN` / `SERVICE-STRUCTURE-GUIDE`:

1. **audit-svc / los-svc** — SQLAlchemy models, `schema.sql`, Alembic migrations, dual store:
   - default **SQLite** (`AUDIT_DB` / `LOS_DB`)
   - **Postgres** when `DATABASE_URL` starts with `postgres`
   - `GET /ready` DB ping; health reports `backend`
2. **Layered layout** for policy, cic, aml, property, income (api / schemas / services / repositories / core). HTTP contracts unchanged.

## Schema summary

### audit-svc (owns DB)
- `audit_record` — id uuid, application_id, product, lane, outcome, veto_fired, replan_count, as_of date, signed_by, decided_at text (+ decided_at_ts), **seq**, content_hash, prev_hash
- `audit_violation` — FK record_id, rule fields, is_blocking
- Triggers: forbid UPDATE/DELETE

### los-svc (owns DB)
- `loan_ticket` — ticket_id PK, application_id, status, product, summary, assigned_to, created_at, updated_at
- `ticket_history` — status transitions

### Reference (no SQL)
- cic / aml / property — JSON seed via `repositories/seed.py`
- income / policy — compute / YAML only

## How to run / verify

```bash
# each service (all green locally):
cd services/audit-svc && pytest -q   # 5
cd services/los-svc && pytest -q     # 3
cd services/policy-svc && pytest -q  # 5
cd services/cic-svc && pytest -q     # 2
cd services/aml-svc && pytest -q     # 2
cd services/property-svc && pytest -q # 2
cd services/income-svc && pytest -q  # 2

# Postgres migrate (optional, own DB per service):
cd services/audit-svc
$env:DATABASE_URL="postgresql://..."
alembic upgrade head
```

## Contract impact
none on monolith `schemas.py` / web `api.ts`. Service HTTP shapes preserved.

## Follow-ups
- [ ] Wire compose Postgres containers for audit-data / los-data (replace SQLite volumes)
- [ ] Layer api-gateway + agent-worker the same way
- [ ] Contract tests OpenAPI export per service
- [ ] Idempotency on audit `(application_id, decided_at)`

## Gotchas
- audit Postgres hash uses `as_of.isoformat()` — callers should send `YYYY-MM-DD`.
- `create_all` at Postgres init is a **dev convenience**; prod should run Alembic only.
- Do **not** point audit + los at the same database — ownership rule.
