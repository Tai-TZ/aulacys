# Handoff - Phase 4 gateway status monitor

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** develop working tree
- **Status:** Done

## What changed & why
Completed Phase 4 from `docs/MICROSERVICES-STATUS.md`: an `api-gateway` service now fronts the demo with `/assess` and a `/status` health board. The gateway pings the monolith and every extracted service, and returns degraded/fallback responses instead of crashing when a network call fails. The web client page now includes a service monitor tile that reads gateway status and can run the mortgage trace through gateway on demand.

## Files touched
- `services/api-gateway/` - new FastAPI gateway with `/health`, `/status`, `/api/v1/status`, `/assess`, and `/api/v1/assess`.
- `docker-compose.services.yml` - added `api-gateway` on port 8080 with service URL env vars.
- `apps/api/src/models/schemas.py` - added service monitor response models for the shared contract.
- `apps/api/tests/test_api/test_gateway.py` - tests status aggregation and assess fallback when monolith is unavailable.
- `apps/web/lib/api.ts` - mirrored service status types and added gateway client helpers.
- `apps/web/components/client/service-monitor.tsx` - new dashboard tile for service health and trace display.
- `apps/web/app/client/page.tsx` - renders the service monitor on the client landing page.
- `apps/web/.env.example` - documents `NEXT_PUBLIC_GATEWAY_URL`.
- `docs/MICROSERVICES-STATUS.md`, `services/README.md` - updated Phase 4 runbook/status.

## How to run / verify
```powershell
cd D:\aiinovation\apps\api
& 'D:\aiinovation\.venv\Scripts\python.exe' -m ruff check src/ tests/
& 'D:\aiinovation\.venv\Scripts\python.exe' -m ruff format --check src/ tests/
& 'D:\aiinovation\.venv\Scripts\python.exe' -m pytest tests/ -v
cd D:\aiinovation
& 'D:\aiinovation\.venv\Scripts\python.exe' -m compileall services\api-gateway
cd D:\aiinovation\apps\web
npm run lint
npm run build
```

Expected result: Ruff check passes, Ruff format reports `55 files already formatted`, pytest reports `52 passed`, gateway compiles, web lint has no warnings/errors, and Next build completes.

## Contract impact
Changed. Added `ServiceStatusItem`, `ServiceStatusSummary`, and `ServiceStatusResponse` in `apps/api/src/models/schemas.py`; mirrored them in `apps/web/lib/api.ts`. Existing `AssessResponse` behavior is unchanged, and gateway `/assess` returns the same shape with a fallback `gateway_unavailable` outcome if monolith is down.

## Follow-ups / TODO
- [ ] Smoke-test the full process set with Docker or eight local service terminals plus monolith.
- [ ] Decide whether production web should point `NEXT_PUBLIC_API_URL` at the monolith or route all assess traffic through `NEXT_PUBLIC_GATEWAY_URL`.
- [ ] Keep Phase 5 gated; moving agent workers over HTTP is still high-risk for the veto demo.

## Gotchas
The service monitor intentionally does not auto-run `/assess` on page load because `/assess` writes tickets/audit records. The user must click "Chạy trace demo" to generate the trace. `api-gateway` defaults to localhost service URLs for local dev; Docker compose overrides them with service DNS names and `host.docker.internal` for the monolith.
