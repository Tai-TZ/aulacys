# Handoff — application-svc → orchestrator (Bước 2)

- **Date:** 2026-07-18
- **Author:** agent
- **Branch / PR:** local (uncommitted)
- **Status:** ✅ Done

## What changed & why

Orchestrator can assess by **application-svc id**: `POST /api/v1/assess/application` with `{application_id}` loads Section A, maps to `DeclaredForm` (income/expense/purpose/CCCD/consent), enforces **data_processing_consent** (400 if false), then runs the graph. Body path (`product` + `declared`) unchanged for the dashboard.

## Files touched

- `apps/api/src/agents/application_client.py` — fetch + mapper + `ConsentDeniedError`
- `apps/api/src/models/schemas.py` — `AssessApplicationRequest.application_id` optional mode
- `apps/api/src/api/routes.py` — resolve body vs id; 400 / 502
- `apps/web/lib/api.ts` — mirror optional fields
- `apps/api/tests/test_agents/test_application_client.py` + route tests
- `docs/APPLICATION-SCHEMA.md` — phase 3/4 status

## How to run / verify

```bash
cd apps/api && python -m pytest tests/test_agents/test_application_client.py tests/test_api/test_routes.py -q

# E2E with services up:
# 1) POST localhost:8360/applications  (consent true)
# 2) POST localhost:8000/api/v1/assess/application  {"application_id":"<uuid>"}
#    APPLICATION_SVC_URL=http://127.0.0.1:8360
```

## Contract impact

`AssessApplicationRequest` now accepts **either** `application_id` **or** `product`+`declared`. Web types updated. Announce to FE agents.

## Follow-ups / TODO

- [ ] Bước 3: Postgres for service tests in CI
- [ ] Map employment / spouse into Credit metrics
- [ ] Mortgage docs (so_do, purpose_evidence) still need body or richer application schema
- [ ] UI: submit to application-svc then assess by id

## Gotchas

- `personal_expense` → `existing_monthly_debt` (DTI slot until richer model).
- Id path without `APPLICATION_SVC_URL` / 404 → **502**, not seed fallback (avoids silent wrong applicant).
- Chat `/assess` still uses `seed_application` — intentional quick demo path.
