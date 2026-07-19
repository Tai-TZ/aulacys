# Handoff — Credit at stage-2 RM đề xuất

- **Date:** 2026-07-19
- **Author:** agent (Cursor)
- **Branch / PR:** feat/catalog-crud-dossier-db
- **Status:** ✅ Done

## What changed & why

Aligned UI/API with `FLOW-BUSINESS-CONFIRMED.md`: **Credit runs at stage 2 (RM đề xuất)** and returns `LoanProposal` + recommendation + rationale. Stage 3 **Chạy thẩm định** still runs the full graph (Ops/Compliance/Critic + Credit re-check) to đối chiếu tiêu chí/policy. Previously Credit only appeared after full assess, so step 2 looked like a plain form.

## Files touched

- `packages/shared/aulacys/agents/graph.py` — `run_credit_proposal()`
- `packages/shared/aulacys/models/schemas.py` — `CreditProposalResponse`
- `services/orchestrator-svc/app/api/routes.py` — `POST /api/v1/assess/proposal`
- `apps/web/lib/api.ts` — `assessCreditProposal`
- `apps/web/components/admin/assess-dashboard.tsx` — auto Credit after tiếp nhận + popup
- tests: `test_credit_proposal.py`, `test_routes.py::test_assess_proposal_…`

## How to run / verify

```powershell
# Restart orchestrator so the new route loads
cd d:\aulacys\services\orchestrator-svc
$env:PYTHONPATH="d:\aulacys\packages\shared;d:\aulacys\services\orchestrator-svc"
d:\aulacys\apps\api\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload

# Tests
$env:PYTHONPATH="d:\aulacys\packages\shared;d:\aulacys\services\orchestrator-svc"
d:\aulacys\apps\api\.venv\Scripts\python.exe -m pytest packages/shared/tests/test_agents/test_credit_proposal.py services/orchestrator-svc/tests/test_api/test_routes.py::test_assess_proposal_credit_only_no_compliance -q
```

UI: mở hồ sơ → **Tiếp nhận** → Credit chạy → popup **Đề xuất phương án vay** → chỉnh form → **Chạy thẩm định**.

## Contract impact

Changed: added `CreditProposalResponse` + `POST /api/v1/assess/proposal`. Mirrored in `apps/web/lib/api.ts`. Existing `/assess/application` unchanged.

## Follow-ups / TODO

- [ ] Optionally strip Credit from stage-3 DAG and only run Ops/Compliance/Critic against the stage-2 proposal (stronger separation).
- [ ] Stream/progress events while Credit tools run (today: spinner until response).

## Gotchas

- Orchestrator must be restarted (or `--reload`) to pick up the new route.
- Stage 3 still re-runs Credit inside the full graph — numbers may differ slightly if RM edited the form after the popup.
