# income-svc

Stateless income verification + statement parsing. Owns **no data** — pure compute. The
orchestrator's Credit agent verifies declared vs statement income and parses a bank
statement.

## Role

Deterministic compute (no DB, no seed, no LLM). Mirrors payroll / open-banking checks.

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | liveness |
| `POST` | `/verify` | `{declared_monthly_income, statement_monthly_income?}` → `{verified_monthly_income, …}` |
| `POST` | `/statement-parse` | parse a statement → structured income |

Negative inputs return a typed `{error}` (no crash).

## Run

```bash
cd services/income-svc
pip install -r requirements.txt
uvicorn app.main:app --port 8340
```

## Storage / Env

- **Storage:** none (stateless).
- **Env:** none required. Called via `INCOME_SVC_URL`.
