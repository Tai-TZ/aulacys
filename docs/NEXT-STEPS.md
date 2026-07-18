# Next Steps

This is the pickup note for the next human or agent after Phase 4.

## Current Baseline

- Branch: `feat/services-gateway-monitor`
- Last completed slice: Phase 6, distributed agent-worker transport.
- Green checks from the last run:
  - `ruff check src/ tests/`
  - `ruff format --check src/ tests/`
  - `pytest tests/ -v` -> `52 passed`
  - `npm run lint`
  - `npm run build`
- Main demo path still works without services because every HTTP seam has an
  in-process fallback.

## Run The Demo Locally

Terminal 1, monolith:

```powershell
cd D:\aiinovation\apps\api
& 'D:\aiinovation\.venv\Scripts\python.exe' -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

Terminal 2, gateway:

```powershell
cd D:\aiinovation\services\api-gateway
$env:MONOLITH_URL="http://127.0.0.1:8000"
& 'D:\aiinovation\.venv\Scripts\python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 8080
```

Terminal 3, web:

```powershell
cd D:\aiinovation\apps\web
$env:NEXT_PUBLIC_API_URL="http://localhost:8000"
$env:NEXT_PUBLIC_GATEWAY_URL="http://localhost:8080"
npm run dev -- -p 3000
```

Open:

- Web: `http://localhost:3000/client`
- Gateway status: `http://localhost:8080/status`
- Monolith health: `http://localhost:8000/health`

## Priority Order

Do these in order. Phase 5/6 now exist behind env-gated fallbacks; keep the
default demo path stable before enabling every worker live.

### 1. Lock the demo board

Goal: the user can open one screen, see the service board, run the mortgage trace,
and explain the veto/replan branch in under five minutes.

Tasks:

- Make sure the service monitor tile still renders cleanly on mobile and desktop.
- Add a visible degraded state for gateway-down and service-down cases if it is not
  clear enough in rehearsal.
- Decide whether the presenter should click the trace button live or use a
  preloaded trace screenshot/video as backup.
- Keep `/assess` manual-triggered only. It writes ticket/audit side effects.

Verify:

```powershell
cd D:\aiinovation\apps\web
npm run lint
npm run build
```

### 2. Fix stale scenario docs

Goal: eliminate contradictory guidance before another agent builds from the wrong
story.

Tasks:

- Update `docs/00-START-HERE.md`; it still describes the old corporate 20bn
  scenario while `AGENTS.md` says the active slice is retail mortgage.
- Update any slide/pitch text that says corporate lending is the main demo.
- Keep the old corporate scenario only as historical reference if needed.

Verify:

```powershell
rg -n "20|corporate|doanh nghi" docs AGENTS.md
```

Expected: references are either removed from active-start docs or clearly marked
superseded.

### 3. Add policy version metadata

Goal: audit records should cite a real policy version, not only
`ef:<effective_from>`.

Tasks:

- Add a `version` field to policy rule models and YAML rules.
- Return `PolicyViolation.version` from `apps/api/src/policy/loader.py`.
- Mirror the field in `services/policy-svc/app/policy.py`.
- Add tests for version propagation.

Verify:

```powershell
cd D:\aiinovation\apps\api
& 'D:\aiinovation\.venv\Scripts\python.exe' -m pytest tests/test_policy -v
```

### 4. Decide whether to expose credit and operations

Goal: only expose more API data if the dashboard needs it.

Tasks:

- Check the web dashboard needs: CIC score band, verified income, valuation, legal
  flags.
- If needed, update `AssessResponse` in `apps/api/src/models/schemas.py` first.
- Mirror the exact shape in `apps/web/lib/api.ts`.
- Add route and web tests for the new fields.

Do not expose raw full state. Keep the dashboard contract narrow.

### 5. Docker smoke test the full service set

Goal: prove compose works as a service story, not just local uvicorn terminals.

Tasks:

- Run services with Docker compose.
- Run monolith with all service URLs set.
- Hit gateway `/status` and `/assess`.
- Record any port or Windows networking gotchas in `docs/MICROSERVICES-STATUS.md`.

Verify:

```powershell
docker compose -f docker-compose.services.yml up --build
```

Then in another terminal:

```powershell
curl.exe -s http://localhost:8080/status
curl.exe -s http://localhost:8080/assess -H "content-type: application/json" -d "{\"message\":\"retail mortgage\"}"
```

## Distributed Worker Notes

### Phase 5 agent workers

`credit-svc`, `operations-svc`, `compliance-svc`, and `critic-svc` now run from
the shared `services/agent-worker-svc` image. The monolith calls them only when
these env vars are set:

```powershell
$env:CREDIT_AGENT_URL="http://127.0.0.1:8401"
$env:OPERATIONS_AGENT_URL="http://127.0.0.1:8402"
$env:COMPLIANCE_AGENT_URL="http://127.0.0.1:8403"
$env:CRITIC_AGENT_URL="http://127.0.0.1:8404"
```

If any worker is unavailable or returns an invalid shape, the orchestrator falls
back to the in-process harness. Trace entries show `model: "http-worker:*"` when
the network path is used.

### Phase 6 orchestrator boundary

The orchestrator now coordinates worker calls and propagates `metadata.request_id`
as `X-Request-ID`. Planner remains in-process on purpose; it owns the graph edge
and replan loop, so moving it out should wait until after demo lock.

## Commit Discipline

Keep commits small:

- `docs(next): align active demo guidance`
- `feat(policy): add rule version metadata`
- `feat(web): improve service monitor states`
- `test(services): smoke compose status`

Do not commit local settings, `.env`, `.venv`, `.next`, `node_modules`, caches, or
generated PID/log files.
