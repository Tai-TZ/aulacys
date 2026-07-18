# policy-svc

Policy Decision Point — deterministic evaluate over versioned YAML rules. Stateless,
no LLM. Compliance agent calls `POST /evaluate` over HTTP.

## Run

```bash
cd services/policy-svc
pip install -r requirements.txt
uvicorn app.main:app --port 8100
pytest -q
```

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | `{status, unverified_rules}` |
| `POST` | `/evaluate` | `{metrics, as_of?}` → `{violations, veto, rule_ids}` |

## Env

| Var | Default |
|-----|---------|
| `RULES_DIR` | `rules/` |

Rules live in `rules/*.yaml` — keep in sync with `apps/api/src/policy/rules/` until
the monolith calls this service exclusively.
