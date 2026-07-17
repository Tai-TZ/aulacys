# Microservices — status & next steps

> Where the split is now and exactly what to do next. Design rationale:
> `ARCHITECTURE-services.md`. System overview: `OVERVIEW.md`.
> Immediate pickup guide: `NEXT-STEPS.md`.

## TL;DR

The monolith (`apps/api`) still runs the whole flow. **6 seams plus one gateway are extracted into
real services** (api-gateway, policy, audit, cic, los, aml, property, income = 8 services + monolith = 9 processes). Each
is called over HTTP **with an in-process fallback** — unset the env var and the
monolith runs alone (demo-proof). Full veto flow verified across all 9. `52 tests
green, ruff clean` (fallback mode).

## Services now

| Service | Port | Owns data | Monolith env var | Status |
| ------- | ---- | --------- | ---------------- | ------ |
| api-gateway | 8080 | health aggregation / front door | `MONOLITH_URL` + service URLs | ✅ wired |
| monolith (orchestrator + agents) | 8000 | — | — | ✅ |
| policy-svc | 8100 | rules (YAML) | `POLICY_SVC_URL` | ✅ wired |
| audit-svc | 8200 | audit ledger (SQLite, append-only + hash chain) | `AUDIT_SVC_URL` | ✅ wired |
| cic-svc | 8300 | cic_records seed (JSON) | `CIC_SVC_URL` | ✅ wired |
| los-svc | 8310 | loan_ticket (SQLite) | `LOS_SVC_URL` | ✅ wired |
| aml-svc | 8320 | sanctions/PEP seed (JSON) | `AML_SVC_URL` | ✅ wired |
| property-svc | 8330 | parcel seed (JSON) | `PROPERTY_SVC_URL` | ✅ wired |
| income-svc | 8340 | statement verification mock | `INCOME_SVC_URL` | ✅ wired |

Wiring pattern (every seam): `apps/api/.../{policy/client.py, agents/audit_client.py,
tools/cic.py, tools/workflow.py, tools/aml.py, tools/property.py, tools/income.py}` → if env URL set, HTTP call; else in-process fallback
(urllib, no new dependency).

## How to run the whole thing

**Option A — Docker (all services):**
```bash
docker compose -f docker-compose.services.yml up --build   # gateway, policy, audit, cic, los, aml, property, income
# then run the monolith with the service URLs (see below)
```

**Option B — local (one terminal per service, from repo root):**
```bash
# from each service dir:
cd services/policy-svc && uvicorn app.main:app --port 8100
cd services/audit-svc  && uvicorn app.main:app --port 8200
cd services/cic-svc    && uvicorn app.main:app --port 8300
cd services/los-svc    && uvicorn app.main:app --port 8310
cd services/aml-svc    && uvicorn app.main:app --port 8320
cd services/property-svc && uvicorn app.main:app --port 8330
cd services/income-svc && uvicorn app.main:app --port 8340
cd services/api-gateway && uvicorn app.main:app --port 8080
```
**Monolith wired to all services (PowerShell):**
```powershell
$env:POLICY_SVC_URL="http://127.0.0.1:8100"
$env:AUDIT_SVC_URL ="http://127.0.0.1:8200"
$env:CIC_SVC_URL   ="http://127.0.0.1:8300"
$env:LOS_SVC_URL   ="http://127.0.0.1:8310"
$env:AML_SVC_URL   ="http://127.0.0.1:8320"
$env:PROPERTY_SVC_URL="http://127.0.0.1:8330"
$env:INCOME_SVC_URL="http://127.0.0.1:8340"
cd apps/api; python -m uvicorn src.main:app --port 8000
```
**Gateway env (PowerShell):**
```powershell
$env:MONOLITH_URL="http://127.0.0.1:8000"
$env:POLICY_SVC_URL="http://127.0.0.1:8100"
$env:AUDIT_SVC_URL ="http://127.0.0.1:8200"
$env:CIC_SVC_URL   ="http://127.0.0.1:8300"
$env:LOS_SVC_URL   ="http://127.0.0.1:8310"
$env:AML_SVC_URL   ="http://127.0.0.1:8320"
$env:PROPERTY_SVC_URL="http://127.0.0.1:8330"
$env:INCOME_SVC_URL="http://127.0.0.1:8340"
cd services/api-gateway; python -m uvicorn app.main:app --port 8080
```
**Smoke test:**
```bash
curl -s localhost:8080/assess -H "content-type: application/json" -d "{\"message\":\"retail mortgage\"}"
# outcome=vetoed, ticket.source=los-svc, audit.seq=N
curl -s localhost:8080/status        # service board
curl -s localhost:8200/verify        # {"intact": true, ...}
curl -s localhost:8310/tickets/retail-demo
```
**Monolith alone (no services):** unset the env vars — everything falls back in-process, `52 tests` still pass.

## Commit status

The service split, web monitor, and runbook updates are committed on
`feat/services-gateway-monitor`. See `NEXT-STEPS.md` for the next pickup order.

## Next steps (in order)

### Phase 3 leftover — copy the cic-svc pattern (low risk, ~30 min each)
- [x] `aml-svc` (8320) — seed `sanctions_list` / `pep_list`; wire `tools/aml.py`.
- [x] `property-svc` (8330) — seed `parcel`; wire `tools/property.py`.
- [x] `income-svc` (8340) — wire `tools/income.py`.
Each = copy `services/cic-svc/`, change seed + endpoint, add a compose block, add the
env-gated HTTP call in the tool (same shape as `tools/cic.py`).

### Phase 4 — api-gateway + status monitor (safe, high demo value)
- [x] `api-gateway` (front door): proxy `/assess` to the monolith; one entry point.
- [x] **status aggregator**: `GET /status` pings every service `/health` → one board.
  This is the "service monitor" — the cheap answer instead of Prometheus/Jaeger.
- [x] Dashboard tile in `apps/web` reading `/status` + the `/assess` `trace[]`.

### Phase 5 — agent workers over network (⚠️ HIGH RISK — decide first)
- [ ] `credit-svc`, `operations-svc`, `compliance-svc`, `critic-svc` (8400s).
- [ ] Orchestrator calls them over HTTP instead of `run(spec, state)`.
> This puts the **veto→replan loop across the network** — slower, more failure points,
> can break the demo. Do NOT start before the demo is otherwise locked (`AGENTS.md`:43,
> hour-36 stop). Keep the in-process worker as fallback.

### Phase 6 — full distributed orchestrator
- [ ] Orchestrator becomes pure coordination; every node is a service call with
  request_id propagation for distributed tracing.

## Known gaps (unrelated to the split)
- [ ] Frontend dashboard rendering `/assess` (lane badge, veto banner, replan counter, node timeline).
- [ ] `PolicyViolation.version` — audit uses `ef:<effective_from>` as a stand-in; add a real version field in `loader.py`.
- [ ] DAG drives execution — `_run_configured_agents` iterates config, not the Planner's DAG.
- [ ] `AssessResponse` does not expose `credit`/`operations` — add if the dashboard needs CIC band / valuation.
- [ ] `00-START-HERE.md` still shows the dead corporate 20bn scenario — contradicts `AGENTS.md` §0, fix it.

## The pitch (what this buys)
"Each seam is a real service with its own data, called over HTTP, with an in-process
fallback so a dead service never breaks the demo. Service boundaries mirror the bank's
real integration points — CIC, the LOS, the policy engine, the audit ledger. Splitting
further is changing transport, not rewriting logic."
