# Handoff — Operations readiness + LLM prose

- **Date:** 2026-07-19
- **Author:** Cursor agent
- **Branch / PR:** `feat/operations-reasonableness-llm-prose` → develop (stacks on Credit/Compliance prose)
- **Status:** ✅ Done

## What changed & why
Operations now assesses operational readiness (docs, valuation schedule, registry flags) from tools only, records findings under `tool_results.operational_readiness`, and opts into `llm_prose` for qualitative `rationale`. Secured products without `collateral_value_declared` fail closed on valuation. Land-registry dispute/zoning are read from `so_do` extract — not hard-coded false. Unsecured products skip valuation tools.

## Files touched
- `packages/shared/aulacys/agents/nodes/operations.py` — readiness helpers, evidence by tool call, prose opt-in
- `packages/shared/aulacys/agents/state.py` — `OperationsReport.rationale`
- `apps/web/lib/api.ts` — mirror `rationale`
- `packages/shared/tests/test_agents/test_operations.py` — secured/unsecured/dispute/fail-closed
- `docs/AGENT-SPEC.md` — Operations output includes rationale

## How to run / verify
```bash
cd packages/shared
python -m pytest tests/test_agents/test_operations.py tests/ -q
```

## Contract impact
**Yes.** `OperationsReport.rationale: str = ""` added; `apps/web/lib/api.ts` updated.

## Follow-ups / TODO
- [ ] Surface Ops rationale + readiness findings on assess UI
- [ ] Wire real property-svc dispute flags in demo seeds when available

## Gotchas
Depends on Credit/Compliance prose branch if not yet on `develop`. Valuation amounts must stay out of rationale text. Ticket writes remain via `write_outcome_ticket` / `workflow_write` only.
