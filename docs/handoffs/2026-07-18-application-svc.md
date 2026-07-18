# Handoff — application-svc Phase 1–2 (SHBFinance Section A)

- **Date:** 2026-07-18
- **Author:** agent
- **Branch / PR:** local (uncommitted)
- **Status:** ✅ Done (phases 1–2); phases 3–6 pending

## What changed & why

Implemented `docs/APPLICATION-SCHEMA.md` phases 1–2: new **`application-svc`** (:8360) owns Postgres schema `application` with the 13 real SHBFinance Section A tables (replacing the guessed 8-field `DeclaredForm` for intake storage). `POST /applications` rejects requests without `data_processing_consent=true` (hard gate). Gateway health + `/applications` proxy wired; orchestrator still uses `seed_application` until phase 3.

## Files touched

- `services/application-svc/**` — new service (models, Alembic `0001_application`, repo, consent gate, tests)
- `services/db/init-schemas.sql` — `CREATE SCHEMA application`
- `services/api-gateway/app/main.py` — ServiceSpec + proxy
- `docker-compose.yml`, `docker-compose.services.yml` — service block + env
- `docs/APPLICATION-SCHEMA.md`, `CONFIG.md`, `SUPABASE-SCHEMA-PER-SERVICE.md` — status + env

## How to run / verify

```bash
# fill secrets in services/application-svc/.env (or local compose postgres)
cd services/application-svc
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --port 8360

# tests (skip if Postgres down)
pytest -q

curl -s localhost:8360/health
# POST with consent:false → 400; consent:true → {id, source:application-svc}
```

## Contract impact

none — intake lives on application-svc; monolith `DeclaredForm` / `schemas.py` unchanged until phase 3–4.

## Follow-ups / TODO

- [ ] Phase 3: orchestrator `APPLICATION_SVC_URL` client + load by id (keep `seed_application` fallback)
- [ ] Phase 4: map financial/purpose → Credit/Compliance metrics
- [ ] Phase 5–6: RLS + PII mask + auth-svc
- [ ] Supabase: `CREATE SCHEMA application;` then alembic against DIRECT_URL
- [ ] Update `SERVICE-CODING-PLAN.md` snapshot row for application-svc

## Gotchas

- PII in responses is unmasked for now (phase 5). Do not log request bodies.
- Column `reference_person.relationship` shadows SQLAlchemy `relationship()` — models import it as `orm_relationship`.
- Alembic `env.py` sets `search_path` + `version_table_schema=application` — run against session pooler (`DIRECT_URL`).
- Gateway `/applications` returns `{status_code, detail}` on 4xx instead of FastAPI status passthrough — call `:8360` directly for accurate HTTP codes in tests.
