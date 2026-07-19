# Handoff - Agent flow contract alignment

- **Date:** 2026-07-19
- **Author:** Codex
- **Branch / PR:** `feat/agents-llm-real` -> develop
- **Status:** Done

## What changed & why
Aligned the backend agent demo flow with the frontend expectation for the mortgage scenario. `retail mortgage` now drives the default wow-flow seed through the purpose-contradiction veto branch, while `retail mortgage clean` remains available for the clean HITL path. The frontend dashboard now renders `critic.review`, guards optional critic arrays, and shows run logs while the assess API is still in flight. The backend now emits terminal logs for each graph step and agent call. `/api/v1/applications` also has a seeded fallback when `application-svc` is not running, so the admin dossier page remains usable in the demo profile.

## Files touched
- `packages/shared/aulacys/agents/graph.py` - made the default mortgage seed use the veto demo branch and aligned the mortgage seed ID with seeded CIC/KYC data.
- `services/orchestrator-svc/app/main.py` - enables app/aulacys INFO logs while keeping noisy HTTP client logs at warning level.
- `packages/shared/aulacys/agents/graph.py` - logs run start, DAG order, node start/done, replan, critic, gate, and final outcome with `request_id`.
- `packages/shared/tests/test_agents/test_graph.py` - kept the clean mortgage HITL test explicit with `retail mortgage clean`.
- `services/api-gateway/app/main.py` - added `critic: None` to the gateway fallback assess payload so the response shape stays stable.
- `apps/web/components/admin/assess-dashboard.tsx` - displays `critic.review` in both critic panels and handles missing `rejections` / `remediation_plan` arrays defensively.
- `apps/web/components/admin/agent-run-progress.tsx` - adds visible per-step agent logs during the running state before backend trace is available.
- `packages/shared/aulacys/services/applications_proxy.py` - added seeded fallback dossier rows and shortened unreachable-service logging/timeouts.
- `services/orchestrator-svc/app/api/routes.py` - returns seeded fallback rows instead of a 503 when `application-svc` is down.
- `services/orchestrator-svc/tests/test_api/test_applications_list.py` - asserts fallback behavior for the down-service case.
- `scripts/stack.ps1` - defaults `up` to the full microservice profile, keeps `-Profile demo` available, clears stale logs on `up`, and does not abort immediately when `taskkill` fails.

## How to run / verify
```bash
cd services/orchestrator-svc && python -m pytest tests -q
cd packages/shared && python -m pytest tests -q
cd apps/web && npm run lint
cd apps/web && npm run build
python -m ruff check packages\shared\aulacys\agents\graph.py packages\shared\aulacys\services\applications_proxy.py services\api-gateway\app\main.py services\orchestrator-svc\app\api\routes.py services\orchestrator-svc\tests\test_api\test_applications_list.py packages\shared\tests\test_agents\test_graph.py
```

Expected result:
- Orchestrator tests: `35 passed`
- Shared agent tests: `135 passed`
- Frontend lint: no ESLint warnings or errors
- Frontend build: compiled successfully
- Ruff: all checks passed

## Contract impact
No backend schema file change. `AssessResponse` already includes `critic`; the frontend type already includes optional `critic.review`. This change makes the gateway fallback include `critic` and makes the dashboard render the new review text safely.

## Follow-ups / TODO
- [ ] Consider adding a frontend fixture/unit test for an assess response with `critic.review` once web test tooling is in place.
- [ ] Keep `retail mortgage clean` documented for demos that need the non-veto HITL path.
- [ ] If a local stack process cannot be killed due to Windows access denial, close the owning terminal/Codex-launched process or rerun PowerShell as Administrator, then start the stack again.

## Gotchas
`retail mortgage` is intentionally the veto demo path now. Use `retail mortgage clean` when validating the clean HITL path; otherwise tests or demos may look like they are failing when they are exercising the designed veto branch.
The demo stack does not start `application-svc`; the admin page now receives seeded fallback rows from the orchestrator. The code is fixed, but any already-running API process must be restarted before `/api/v1/applications` changes from the old 503 behavior to the new fallback behavior.
