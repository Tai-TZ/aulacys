# orchestrator-svc (`apps/api`)

Composition-root service. Holds the assessment **graph + veto→replan loop** and
coordinates every other service. Nothing runs without it — it is the one service that
must always be up.

## Role

- Runs the flow: plan → Credit + Operations (parallel) → Compliance → **veto → replan**
  (bounded by a cap → escalate to human) → Critic (lane 3) → ticket + audit.
- Product config (`src/agents/products/*.yaml`) drives which agents/tools/gate run — no
  `if product` in code.
- Calls each service over HTTP when its env URL is set; otherwise runs that piece
  **in-process (fallback)**, so the demo survives a dead service.

## Endpoints (`/api/v1`)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | liveness + DB status; never 500 |
| `POST` | `/chat` | summary string only |
| `POST` | `/assess` | structured run (`AssessResponse`) for the dashboard |
| `POST` | `/assess/application` | assess a full `LoanApplication` (not seed-from-message) |
| `POST` | `/approvals` | HITL: human approve/reject → writes ticket |
| `GET` | `/status` | agent status |

Contract lives in `src/models/schemas.py` — mirror it in `apps/web/lib/api.ts`.

## Run

```bash
cd apps/api
pip install -r requirements.txt
uvicorn src.main:app --port 8000      # GET /health → {"status":"ok",...}
python -m pytest -q
```

## Env (all optional — unset ⇒ in-process fallback)

| Var | Purpose |
|-----|---------|
| `POLICY_SVC_URL` | call policy-svc for veto evaluation |
| `AUDIT_SVC_URL` | append decisions to audit-svc |
| `CIC_SVC_URL` / `INCOME_SVC_URL` | Credit tool services |
| `PROPERTY_SVC_URL` | Operations tool service |
| `AML_SVC_URL` | Compliance screening service |
| `LOS_SVC_URL` | write the approval ticket |
| `CREDIT_/OPERATIONS_/COMPLIANCE_/CRITIC_AGENT_URL` | run agents as network workers |
| `OPENAI_API_KEY`, `STRONG_MODEL`, `MINI_MODEL`, `MODEL_NAME` | LLM tiers (agents fall back deterministically when unset) |
| `DATABASE_URL` / `DIRECT_URL` | Supabase Postgres (runtime / migrations); empty ⇒ in-memory |
