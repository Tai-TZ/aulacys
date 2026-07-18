# Handoff - Single agent runtime

- **Date:** 2026-07-19
- **Author:** Codex
- **Branch / PR:** `codex/planner-dag-hardening` -> PR #40
- **Status:** Done

## What changed & why
Agent workers are collapsed from per-agent processes into one stateless `agent-worker-svc` runtime on port `8400`. The runtime dispatches by request body field `agent` and supports `planner`, `credit`, `operations`, `compliance`, and `critic`. The orchestrator now prefers one `AGENT_WORKER_URL`, while legacy per-agent URLs still work as compatibility fallback.

## Files touched
- `services/agent-worker-svc/app/main.py` - removed `AGENT_NAME` locking; added multi-agent dispatch and Planner support through the shared harness runner.
- `packages/shared/aulacys/agents/worker_client.py` - added `AGENT_WORKER_URL` as the preferred worker endpoint; kept legacy per-agent env vars.
- `packages/shared/aulacys/agents/graph.py` - routes Planner through `run_agent(...)` so it can use the shared runtime when configured.
- `docker-compose.yml`, `docker-compose.services.yml`, `scripts/stack.ps1` - start one `agent-worker-svc` on `8400`.
- `scripts/deploy-gcp-draft.ps1`, `scripts/deploy-gcp-draft.sh` - deploy one Cloud Run `agent-worker-svc` and wire `AGENT_WORKER_URL`.
- `services/api-gateway/app/main.py`, env examples, and service docs - gateway status monitors one agent runtime.
- Tests under `packages/shared`, `services/agent-worker-svc`, and `services/orchestrator-svc` cover the new single-runtime path.

## How to run / verify
```bash
cd packages/shared
python -m ruff check aulacys tests
python -m ruff format --check aulacys tests
python -m pytest tests/ -q

cd services/agent-worker-svc
python -m ruff check app tests
python -m ruff format --check app tests
python -m pytest tests -q

cd services/api-gateway
python -m ruff check app
python -m ruff format --check app

cd ../orchestrator-svc
python -m pytest tests/test_api/test_gateway.py -q

cd ../..
docker compose -f docker-compose.yml config --quiet
docker compose -f docker-compose.services.yml config --quiet
```

Expected result: shared tests `96 passed`, agent-worker tests `3 passed`, gateway route tests `2 passed`, compose configs are valid.

## Contract impact
No public API schema change. Runtime/env contract changed: prefer `AGENT_WORKER_URL=http://...:8400`; legacy `CREDIT_AGENT_URL`, `OPERATIONS_AGENT_URL`, `COMPLIANCE_AGENT_URL`, `CRITIC_AGENT_URL`, and `PLANNER_AGENT_URL` remain accepted by `worker_client.py`.

## Follow-ups / TODO
- [ ] Remove legacy per-agent env vars after teammates migrate their local `.env` files.
- [ ] Persist `planner_plan_trace` and agent runtime traces into the orchestrator run ledger.
- [ ] Split `agent-worker-svc/app/main.py` into `api/routes.py` + `services/worker.py` when doing the service-structure hardening pass.

## Gotchas
The agent runtime now calls the shared harness runner, not the raw fallback, so Planner can still use LLM prose when keys are configured while numeric/veto-bearing specs remain deterministic. `bash -n scripts/deploy-gcp-draft.sh` was not a useful verification on this Windows checkout because the shell script currently has CRLF line endings; PowerShell script parsing and Docker Compose config were verified instead.
