# agent-worker-svc

Runs the stateless agent runtime for Planner, Credit, Operations, Compliance, and
Critic in one container. The orchestrator owns flow control and the veto -> replan
loop; this service only executes the requested node and returns its typed output.

## Role

- One image, one process, one port: `:8400`.
- `POST /run` dispatches by request body field `agent`.
- Supported agents: `planner`, `credit`, `operations`, `compliance`, `critic`.
- No data ownership and no database.
- Calls tool/policy services over HTTP when their env URLs are set.
- If this service is down, the orchestrator falls back to in-process execution.

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | `{status, agents}` |
| `POST` | `/run` | `{agent, request_id, state}` + `X-Request-ID` -> `{agent, output, tool_calls, latency_ms}` |

## Run

```bash
cd services/agent-worker-svc
pip install -r requirements.txt
uvicorn app.main:app --port 8400
```

Point the orchestrator at it:

```bash
AGENT_WORKER_URL=http://127.0.0.1:8400
```

## Env

| Var | Purpose |
|-----|---------|
| `CIC_SVC_URL`, `INCOME_SVC_URL` | Credit tools |
| `PROPERTY_SVC_URL` | Operations tools |
| `AML_SVC_URL`, `POLICY_SVC_URL` | Compliance tools |

Legacy per-agent URLs (`CREDIT_AGENT_URL`, `OPERATIONS_AGENT_URL`,
`COMPLIANCE_AGENT_URL`, `CRITIC_AGENT_URL`, `PLANNER_AGENT_URL`) are still accepted
by the orchestrator for backward compatibility, but the target runtime is one
`AGENT_WORKER_URL`.
