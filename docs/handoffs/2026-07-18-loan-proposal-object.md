# Handoff - LoanProposal Object

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `codex/feat-loan-proposal` -> `develop`
- **Status:** Done

## What changed & why
Implemented Phase 1: `LoanProposal` is now a first-class object separate from the older Credit pricing fields. Credit still does not approve or veto; it builds an accepted/revised/rejected proposal from deterministic CIC, income, debt-service, DTI, and pricing tool outputs. The graph copies Credit's proposal to top-level state so API and UI can render the proposal stage explicitly.

## Files touched
- `packages/shared/aulacys/agents/state.py` - added `LoanProposal`, attached it to `CreditAssessment` and `AgentState`.
- `packages/shared/aulacys/agents/nodes/credit.py` - added deterministic proposal builder and revision reasons.
- `packages/shared/aulacys/agents/graph.py` - propagates `credit.proposal` into `state["proposal"]`.
- `packages/shared/aulacys/agents/transport.py` - hydrates `proposal` over worker transport.
- `packages/shared/aulacys/models/schemas.py` and `apps/web/lib/api.ts` - expose/mirror `AssessResponse.proposal`.
- `services/orchestrator-svc/app/api/routes.py` and `services/api-gateway/app/main.py` - include proposal in API responses/fallback.
- `apps/web/components/admin/assess-dashboard.tsx` - renders Credit's returned proposal status/terms/revisions.
- `docs/API.md` - documents the new response field.
- `packages/shared/tests/test_agents/test_proposal.py` and `services/orchestrator-svc/tests/test_api/test_routes.py` - cover accepted/revised/veto and API response shape.
- `services/orchestrator-svc/app/db/models.py` - ruff-format-only change so service format check passes.

## How to run / verify
```powershell
cd D:\aiinovation\packages\shared
python -m ruff check aulacys tests
python -m ruff format --check aulacys tests
python -m pytest tests/ -q

cd D:\aiinovation\services\orchestrator-svc
python -m ruff check app tests
python -m ruff format --check app tests
$env:PYTHONPATH='D:\aiinovation\packages\shared;D:\aiinovation\services\orchestrator-svc'
python -m pytest tests/ -q

cd D:\aiinovation\services\api-gateway
python -m ruff check app
python -m ruff format --check app

cd D:\aiinovation\apps\web
npm run lint
npm run build
```
Expected: shared `90 passed`; orchestrator `34 passed` with one Starlette/httpx deprecation warning; gateway ruff green; web lint/build green.

## Contract impact
Changed. `AssessResponse` now includes `proposal: LoanProposal | null`, and `CreditAssessment` includes optional `proposal`. `apps/web/lib/api.ts` was updated to mirror the backend contract.

## Follow-ups / TODO
- [ ] Phase 2: extract deterministic `ApprovalGate`; current gate can still STP a revised/manual-review proposal because it only reads policy/gate config.
- [ ] Consider moving `proposed_limit` / `proposed_rate` out of `CreditAssessment` after UI/API consumers fully migrate to `proposal`.

## Gotchas
`status="revised"` is about proposal terms, not approval outcome. A proposal can be revised while the current graph still returns `stp_approved`; that mismatch is intentionally left for Phase 2 ApprovalGate.
