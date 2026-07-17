# Handoff - Distributed Agent Workers

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `feat/distributed-agent-workers` -> `develop`
- **Status:** Done

## What changed & why

Phase 5/6 now exist as an env-gated network transport for specialist agents. The orchestrator still owns planning, veto/replan, ticketing, and audit, but `credit`, `operations`, `compliance`, and `critic` can run through HTTP worker services when their `*_AGENT_URL` variables are set. Every worker call falls back to the in-process harness on network or schema failure, so the demo path remains safe.

## Files touched

- `apps/api/src/agents/graph.py` - uses `run_agent()` for specialist/critic nodes and creates `metadata.request_id`.
- `apps/api/src/agents/transport.py` - serializes/hydrates graph state for worker requests.
- `apps/api/src/agents/worker_client.py` - env-gated HTTP worker client with in-process fallback and trace emission.
- `apps/api/tests/test_agents/test_worker_client.py` - covers network worker path and fallback path.
- `apps/api/tests/test_api/test_gateway.py` - updates gateway service-board expectations for the four worker services.
- `services/agent-worker-svc/` - shared worker image/app for `credit`, `operations`, `compliance`, and `critic`.
- `services/api-gateway/app/main.py` - adds agent workers to `/status`.
- `docker-compose.services.yml` - adds four worker service blocks.
- `docs/MICROSERVICES-STATUS.md` and `docs/NEXT-STEPS.md` - mark Phase 5/6 status and run instructions.

## How to run / verify

```powershell
cd D:\aiinovation\apps\api
D:\aiinovation\.venv\Scripts\python.exe -m ruff check src tests
D:\aiinovation\.venv\Scripts\python.exe -m ruff format --check src tests
D:\aiinovation\.venv\Scripts\python.exe -m pytest tests -v

cd D:\aiinovation
docker compose -f docker-compose.services.yml config --quiet
```

Expected result: Ruff passes, API tests pass with `54 passed`, and compose config exits cleanly.

## Contract impact

No public API response contract change in this slice. Runtime contract is internal worker transport: payload is `{ agent, request_id, state }`, response is `{ agent, request_id, output, tool_calls, latency_ms }`.

## Follow-ups / TODO

- [ ] Run a full Docker build/smoke test with all worker services enabled.
- [ ] Decide after demo lock whether Planner should become a service too.
- [ ] If PR #10 merges first/after this branch, resolve the small `AssessResponse`/gateway fallback overlap carefully.

## Gotchas

Worker services intentionally reuse the deterministic fallback functions. A trace entry with `model: "http-worker:deterministic-fallback"` means the node ran over HTTP; `fallback_fired: true` means the monolith had to fall back locally. Keep `*_AGENT_URL` unset for the safest local monolith-only demo.
