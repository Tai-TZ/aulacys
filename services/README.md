# services/ — extracted microservices

The system is a **monolith** (`apps/api`) with clean seams. Services are extracted
here **one at a time**, keeping the monolith runnable as the demo fallback. Target
topology + rationale: `docs/ARCHITECTURE-services.md`.

| Phase | Service | Port | Status |
| ----- | ------- | ---- | ------ |
| 1 | `policy-svc` — Policy Decision Point (`POST /evaluate`) | 8100 | ✅ standing |
| 2 | `audit-svc` - append-only ledger (layered) | 8200 | ✅ |
| 3 | tool/external (`cic`, `aml`, `property`, `income`, `los`) | 83xx | ✅ |
| 3b | `catalog-svc` — retail product catalog | 8350 | ✅ |
| 3c | `legal-svc` — police / court / bank legal blacklist mock | 8370 | ✅ |
| 4 | `api-gateway` (+ `/catalog` proxy) | 8080 | ✅ |
| 5 | agent workers (`credit`, `operations`, `compliance`, `critic`) | 84xx | ✅ |
| 6 | orchestrator wires to HTTP instead of import | — | ✅ (env-gated) |

## Run policy-svc

```bash
# Docker
docker compose -f docker-compose.services.yml up --build policy-svc

# Or local (from services/policy-svc)
uvicorn app.main:app --port 8100
```

```bash
curl -s localhost:8100/evaluate -H 'content-type: application/json' \
  -d '{"metrics":{"prohibited_purpose_refinance_other_bank":1},"as_of":"2026-07-18"}'
# -> {"veto": true, "rule_ids": ["prohibited_purpose_refinance_other_bank"], ...}
```

## How the monolith will call it

`compliance.py` currently does `from src.policy.loader import evaluate`. The service
version swaps that for an HTTP POST to `POLICY_SVC_URL`, with the in-process
`evaluate` kept as the fallback when the env var is unset (demo-proof). That one
change is "extract a seam into a service" — no business logic rewritten.
