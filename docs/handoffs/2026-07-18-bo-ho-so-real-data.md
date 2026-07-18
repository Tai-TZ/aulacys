# Handoff — Admin bộ hồ sơ uses real application-svc data

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** local / develop
- **Status:** ✅ Done

## What changed & why

Admin “Bộ hồ sơ” no longer falls back to 3 hard-coded mock dossiers. The list loads only from `application-svc` (via `apps/api` proxy). Fixed Postgres `search_path` so rows live in schema `application` (seed had landed in `public`, so the API returned 0 while mock kicked in).

## Files touched

- `apps/web/components/admin/assess-dashboard.tsx` — remove mock list fallback; empty/offline messaging
- `apps/web/lib/api.ts` — `listApplications` propagates errors (no silent `[]`)
- `apps/api/src/services/applications_proxy.py` — return `None` when svc unreachable
- `apps/api/src/api/routes.py` — `GET /applications` → **503** if unreachable
- `apps/api/tests/test_api/test_applications_list.py` — 503 + happy-path tests
- `services/application-svc/app/db/engine.py` — prefer `DIRECT_URL`, `prepare_threshold=None`, `SET search_path` on connect
- `services/application-svc/scripts/migrate_public_to_application.py` — one-shot public→application copy (already run)

## How to run / verify

```bash
# 1) application-svc
cd services/application-svc
# ensure .env has DATABASE_URL + DIRECT_URL + DB_SCHEMA=application
..\..\apps\api\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8360

# 2) API (web .env.local points at :8001)
cd apps/api
.\.venv\Scripts\python.exe -m uvicorn src.main:app --host 127.0.0.1 --port 8001 --reload

# 3) smoke
curl http://127.0.0.1:8360/applications?limit=20
curl http://127.0.0.1:8001/api/v1/applications?limit=20
# expect 7 dossiers (3 demo + 4 CCCD). UI subtitle: "Nguồn: application-svc / database (7 hồ sơ)"

# 4) tests
cd apps/api && .\.venv\Scripts\python.exe -m pytest tests/test_api/test_applications_list.py -q
```

## Contract impact

none (list shape unchanged; only error behavior: empty→503 when svc down)

## Follow-ups / TODO

- [ ] Keep `application-svc` running for local admin; without it the list is empty + offline message (no mock)
- [ ] Drop unused `MORTGAGE_DEMO` / `VETO_DEMO` / `HITL_DEMO` constants in assess-dashboard if lint complains
- [ ] Consider schema-qualified SQLAlchemy models (`schema="application"`) so search_path cannot drift again

## Gotchas

- Seed previously wrote into **`public`**. Unqualified queries with `search_path=application` hit an **empty** `application.loan_application` and hide the 7 rows in `public`. Migrate script fixed that once; new seeds with the fixed engine should land in `application`.
- Transaction pooler (`:6543`) + psycopg needs `prepare_threshold=None`. Prefer `DIRECT_URL` (`:5432`) for this sync service.
- First proxy call right after svc restart can 503 (timeout); retry once.
