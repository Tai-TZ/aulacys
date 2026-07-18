# Handoff - Phase 3 tool microservices

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** develop working tree
- **Status:** Done

## What changed & why
Completed the Phase 3 leftover service extraction from `docs/MICROSERVICES-STATUS.md`: AML, property, and income now each have a real FastAPI service on ports 8320, 8330, and 8340. The monolith tools call those services only when their env vars are set, and otherwise keep the deterministic in-process fallback so the demo still runs with no services.

## Files touched
- `services/aml-svc/` - new sanctions/PEP and related-party mock service with seeded JSON.
- `services/property-svc/` - new valuation, land-registry, and document-checklist mock service with parcel seed data.
- `services/income-svc/` - new income verification and statement parsing mock service.
- `apps/api/src/agents/tools/aml.py` - env-gated `AML_SVC_URL` transport plus fallback.
- `apps/api/src/agents/tools/property.py` - env-gated `PROPERTY_SVC_URL` transport plus fallback.
- `apps/api/src/agents/tools/income.py` - env-gated `INCOME_SVC_URL` transport plus fallback.
- `apps/api/tests/test_agents/test_service_tools.py` - focused transport/fallback tests for the new tool seams.
- `docker-compose.services.yml` - compose blocks and healthchecks for the three new services.
- `docs/MICROSERVICES-STATUS.md` - updated service list, run commands, env vars, and Phase 3 checklist.
- `apps/api/src/db/models/audit.py`, `apps/api/src/policy/client.py` - Ruff format only, to make backend format check pass.

## How to run / verify
```powershell
cd D:\aiinovation\apps\api
& 'D:\aiinovation\.venv\Scripts\python.exe' -m ruff check src/ tests/
& 'D:\aiinovation\.venv\Scripts\python.exe' -m ruff format --check src/ tests/
& 'D:\aiinovation\.venv\Scripts\python.exe' -m pytest tests/ -v
cd D:\aiinovation
& 'D:\aiinovation\.venv\Scripts\python.exe' -m compileall services\aml-svc services\property-svc services\income-svc
```

Expected result: Ruff check passes, Ruff format reports `54 files already formatted`, pytest reports `50 passed`, and `compileall` compiles the three new service apps. Pytest may warn that it cannot write `.pytest_cache` under `apps/api`; tests still pass.

## Contract impact
None. No API request/response schema changes were made for this slice.

## Follow-ups / TODO
- [ ] Phase 4 from `docs/MICROSERVICES-STATUS.md`: add an api-gateway and status aggregator for a service monitor board.
- [ ] Optionally smoke-test `docker compose -f docker-compose.services.yml up --build` once Docker is available.
- [ ] Keep Phase 5 agent-worker split gated; it is marked high-risk and should wait until the demo is otherwise locked.

## Gotchas
The service env vars are intentionally optional: `AML_SVC_URL`, `PROPERTY_SVC_URL`, and `INCOME_SVC_URL`. Do not make them required, because the monolith-only fallback is what keeps the demo safe if a sidecar service is down.
