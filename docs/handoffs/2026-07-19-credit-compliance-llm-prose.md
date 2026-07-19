# Handoff — Credit & Compliance LLM prose

- **Date:** 2026-07-19
- **Author:** Cursor agent
- **Branch / PR:** `feat/credit-compliance-llm-prose` → develop
- **Status:** ✅ Done

## What changed & why
Credit and Compliance can call the model for **rationale prose only**, matching Planner/Critic. Numbers, recommendations, veto, and rule IDs stay deterministic: harness runs fallback first, then copies only `prose_fields`. Credit rationale is qualitative (no embedded DTI/payment figures) so LLM polish cannot rewrite metrics. Compliance gained a `rationale` field for the same pattern.

## Files touched
- `packages/shared/aulacys/agents/nodes/credit.py` — qualitative rationale; `llm_prose` + `prose_fields=["rationale"]`
- `packages/shared/aulacys/agents/nodes/compliance.py` — deterministic rationale; same prose opt-in
- `packages/shared/aulacys/agents/state.py` — `ComplianceVerdict.rationale`
- `packages/shared/aulacys/agents/harness/runner.py` — stronger system instruction: do not alter non-prose fields
- `apps/web/lib/api.ts` — mirror `rationale` on `ComplianceVerdict`
- `packages/shared/tests/test_agents/test_credit_metrics.py` / `test_runner.py` — lock prose contract

## How to run / verify
```bash
cd packages/shared
python -m ruff check aulacys tests
python -m pytest tests/ -q
```

Expected: Ruff clean; `108 passed`.

With `LLM_PROVIDER` + API key set, Credit/Compliance traces should show a real model name and `fallback_fired=false` when prose succeeds; without a key, demo path still works via fallback rationale.

## Contract impact
**Yes — announce.** `ComplianceVerdict` adds optional/defaulted `rationale: str = ""`. Updated `apps/web/lib/api.ts`. No change to veto/rule_ids shapes.

## Follow-ups / TODO
- [ ] Same prose opt-in for Operations if the team wants all five agents LLM-visible
- [ ] Show Compliance/Credit rationale in assess dashboard if useful for the pitch
- [ ] Optional post-LLM numeric token scan on rationale (defense in depth)

## Gotchas
`llm_prose=True` does **not** let the model flip `veto` or `recommendation` — runner only copies listed prose fields. Do not put numeric metrics into rationale text. Operations remains `llm_prose=False` on purpose in this slice.
