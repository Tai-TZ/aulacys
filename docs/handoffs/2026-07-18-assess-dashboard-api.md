# Handoff - Assess Dashboard API

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `feat/services-gateway-monitor` -> `develop` | #9
- **Status:** Done

## What changed & why

`POST /api/v1/assess` now returns the real structured dashboard data the frontend needs, not only the summary, run trace, compliance, and timeline. The backend exposes the existing graph `credit` and `operations` objects through the API contract, the frontend TypeScript mirror was updated, and the gateway fallback now preserves the same response shape when the monolith is unavailable.

## Files touched

- `apps/api/src/models/schemas.py` - added `credit` and `operations` to `AssessResponse`.
- `apps/api/src/api/routes.py` - passes graph `credit` and `operations` state into the API response.
- `apps/api/tests/test_api/test_routes.py` - asserts the mortgage demo response includes credit DTI, CIC score band, valuation, and operations flags.
- `apps/web/lib/api.ts` - mirrors the backend contract with `Citation`, `CreditAssessment`, `OperationsReport`, and the new `AssessResponse` fields.
- `services/api-gateway/app/main.py` - adds `credit: null` and `operations: null` to the fallback `/assess` response.
- `docs/API.md` - documents the live `/api/v1/assess` dashboard contract and gateway `/status` endpoint.

## How to run / verify

```bash
cd apps/api
D:\aiinovation\.venv\Scripts\python.exe -m ruff check src tests
D:\aiinovation\.venv\Scripts\python.exe -m ruff format --check src tests
D:\aiinovation\.venv\Scripts\python.exe -m pytest tests -v

cd ..\web
npm run lint
npm run build

cd D:\aiinovation
D:\aiinovation\.venv\Scripts\python.exe -m compileall services\api-gateway
```

Expected result: Ruff passes, API test suite passes with `52 passed`, Next lint/build pass, and gateway compile completes.

## Contract impact

Changed `apps/api/src/models/schemas.py`: `AssessResponse` now includes nullable `credit` and `operations` fields. Mirrored in `apps/web/lib/api.ts` in the same change. Frontend consumers should import these types from `apps/web/lib/api.ts` and handle `null` for gateway fallback or partial failure paths.

## Follow-ups / TODO

- [ ] Wire or refine frontend panels to display `credit.dti`, `credit.tool_results.cic_lookup.score_band`, `operations.valuation`, and `operations.legal_flags`.
- [ ] Add latency/cost values to node traces once the meter emits real per-node metrics.

## Gotchas

The API still intentionally exposes a narrow response, not the raw LangGraph state. Gateway fallback returns `credit` and `operations` as `null`, so UI code must use optional chaining or null states even though the happy-path monolith response contains real objects.
