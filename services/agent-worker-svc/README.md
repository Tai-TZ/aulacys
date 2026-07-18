# agent-worker-svc

Runs a specialist agent node (credit / operations / compliance / critic) as a network
worker. Stateless: `POST /run` executes one node and returns its typed output. The
orchestrator owns flow control (the veto→replan loop stays there); a worker only executes.

## Role

- One image. Today it binds to a single agent via `AGENT_NAME` and rejects others, so the
  four agents run as four processes (8401–8404).
- **Decision (SERVICE-CODING-PLAN §12): collapse to ONE service** serving all four —
  they share one harness, are stateless, own no data. Not yet applied in code.
- Calls tool/policy services (cic/income/property/aml/policy) over HTTP when their env
  URLs are set.

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | `{status, agent}` |
| `POST` | `/run` | `{agent, request_id, state}` + `X-Request-ID` → `{agent, output, tool_calls, latency_ms}` |

## Run

```bash
cd services/agent-worker-svc
pip install -r requirements.txt
AGENT_NAME=credit uvicorn app.main:app --port 8401
```

## Env

| Var | Purpose |
|-----|---------|
| `AGENT_NAME` | `credit` \| `operations` \| `compliance` \| `critic` |
| `CIC_SVC_URL`, `INCOME_SVC_URL` | Credit tools |
| `PROPERTY_SVC_URL` | Operations tools |
| `AML_SVC_URL`, `POLICY_SVC_URL` | Compliance tools |

> Falls back: if a worker is down or returns a bad shape, the orchestrator runs the node
> in-process. Coupling note: currently imports `apps/api` via `sys.path` — make it a
> self-contained package for a clean split.
