# api-gateway

Front door + service monitor. Owns no business logic: it proxies assessment requests to
the orchestrator and reports the health of every service. Returns a **degraded** status
instead of crashing when a service is down.

## Role

- **Proxy:** `POST /assess` → orchestrator `POST /api/v1/assess` (with a gateway fallback
  response if the orchestrator is unreachable).
- **Monitor:** `GET /status` pings every service `/health` in parallel → one board
  (`up`/`down`/`latency` per service, overall `ok|degraded`). This is the cheap
  "service monitor" (instead of Prometheus/Jaeger for the demo).

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | gateway liveness |
| `GET` | `/status`, `/api/v1/status` | aggregated service board |
| `POST` | `/assess`, `/api/v1/assess` | proxy to orchestrator |

## Run

```bash
cd services/api-gateway
pip install -r requirements.txt
uvicorn app.main:app --port 8080
curl -s localhost:8080/status
```

## Env

| Var | Default | Purpose |
|-----|---------|---------|
| `MONOLITH_URL` | `http://127.0.0.1:8000` | orchestrator to proxy to |
| `*_SVC_URL`, `*_AGENT_URL`, `CATALOG_SVC_URL` | localhost ports | health targets |
| `CORS_ORIGINS` | `http://localhost:3000` | web origin |
