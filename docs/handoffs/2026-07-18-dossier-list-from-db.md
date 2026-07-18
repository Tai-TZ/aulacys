# Handoff — Bộ hồ sơ list from database

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Status:** ✅ Done

## What changed & why

Admin `/admin/bo-ho-so` now loads dossiers from Postgres via `application-svc` → `apps/api` proxy. Falls back to the 3 mock scenarios if the svc is down or returns empty.

## Files touched

- `services/application-svc` — `GET /applications`
- `apps/api/src/services/applications_proxy.py` + route `GET /api/v1/applications`
- `apps/web/lib/application-map.ts`, `api.ts`, `assess-dashboard.tsx`
- `apps/api/.env` — added `APPLICATION_SVC_URL=http://127.0.0.1:8360`

## How to run / verify

```bash
# terminal 1
cd services/application-svc && uvicorn app.main:app --port 8360
# terminal 2
cd apps/api && uvicorn src.main:app --port 8000
# terminal 3
cd apps/web && npm run dev
```

Open `http://localhost:3000/admin/bo-ho-so` — expect **7** rows and subtitle `Nguồn: database (7 hồ sơ)`.

## Contract impact

Added `GET /api/v1/applications` (+ `/{id}` proxy). Mirrored in `apps/web/lib/api.ts`.

## Gotchas

- Both **api :8000** and **application-svc :8360** must be running.
- Assess from DB row uses `application_id` when UUID is present.
