# Microservices - status and runbook

> Current service split for the retail lending demo. The orchestrator owns the
> workflow and veto -> replan loop; leaf services expose HTTP seams with local
> fallbacks kept in-process for demo resilience.

## Current Shape

| Service | Port | Role | Caller env |
| ------- | ---- | ---- | ---------- |
| api-gateway | 8080 | front door + `/status` monitor | `MONOLITH_URL`, service URLs |
| orchestrator-svc / apps/api | 8000 | workflow, graph, replan loop | n/a |
| policy-svc | 8100 | deterministic policy/rule engine | `POLICY_SVC_URL` |
| audit-svc | 8200 | append-only audit ledger | `AUDIT_SVC_URL` |
| cic-svc | 8300 | CIC bureau mock | `CIC_SVC_URL` |
| los-svc | 8310 | approval ticket system | `LOS_SVC_URL` |
| aml-svc | 8320 | AML/PEP/sanctions mock | `AML_SVC_URL` |
| property-svc | 8330 | valuation/registry mock | `PROPERTY_SVC_URL` |
| income-svc | 8340 | income verification mock | `INCOME_SVC_URL` |
| catalog-svc | 8350 | retail product catalog | `CATALOG_SVC_URL` |
| application-svc | 8360 | intake/dossier store | `APPLICATION_SVC_URL` |
| legal-svc | 8370 | legal blacklist mock | `LEGAL_SVC_URL` |
| agent-worker-svc | 8400 | Planner/Credit/Operations/Compliance/Critic runtime | `AGENT_WORKER_URL` |

The agent runtime is intentionally one container. It is stateless, owns no data,
and dispatches by `POST /run` body field `agent`.

## Run Locally

Recommended:

```powershell
.\scripts\stack.ps1 up -Profile full
```

Manual agent runtime:

```powershell
cd services/agent-worker-svc
python -m uvicorn app.main:app --port 8400
```

Wire the orchestrator:

```powershell
$env:AGENT_WORKER_URL="http://127.0.0.1:8400"
cd apps/api
python -m uvicorn src.main:app --port 8000
```

Wire the gateway monitor:

```powershell
$env:AGENT_WORKER_URL="http://127.0.0.1:8400"
cd services/api-gateway
python -m uvicorn app.main:app --port 8080
```

## Smoke Tests

```bash
curl -s localhost:8400/health
curl -s localhost:8080/status
curl -s localhost:8080/assess -H "content-type: application/json" -d "{\"message\":\"retail mortgage\"}"
```

Expected when `AGENT_WORKER_URL` is set: agent traces show `model=http-worker:*`.
If `agent-worker-svc` is down or unset, the orchestrator runs the same node logic
in-process and the demo path still returns an assessment.

## Status

- [x] One `agent-worker-svc` serves Planner, Credit, Operations, Compliance, and Critic.
- [x] Orchestrator prefers `AGENT_WORKER_URL` and keeps per-agent URL fallback for compatibility.
- [x] Gateway monitors one `agent-worker-svc`.
- [x] Docker Compose and GCP draft deploy scripts use one agent runtime service.
- [x] Shared and route tests cover the single-runtime path.

## Known Gaps

- [ ] `planner_plan_trace` is still in-memory metadata, not persisted to the run ledger.
- [ ] Gateway status is a lightweight monitor, not Prometheus/OpenTelemetry.
- [ ] Legacy per-agent URL env vars remain accepted for backward compatibility and can be removed in a later cleanup.
