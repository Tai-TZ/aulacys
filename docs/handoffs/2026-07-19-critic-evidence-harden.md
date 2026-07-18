# Handoff — Critic evidence harden + E2E veto rehearsal

- **Date:** 2026-07-19
- **Author:** Cursor agent
- **Branch / PR:** `feat/critic-evidence-harden` → develop
- **Status:** ✅ Done

## What changed & why
Critic now audits more evidence seams (income/CIC, Ops checklist/registry, LoanProposal consistency, policy.evaluate citations + metrics on veto). LLM prose is limited to `remediation_plan` so the numeric audit memo cannot be rewritten. Also confirmed on current `develop` the wow E2E paths: mortgage and unsecured veto → replan → `outcome=vetoed` with Critic lane 3; happy unsecured stays STP.

## Files touched
- `packages/shared/aulacys/agents/nodes/critic.py` — broader evidence checks; `reads` includes `proposal`; `prose_fields=["remediation_plan"]`
- `packages/shared/tests/test_agents/test_critic.py` — pass/fail/citation/spec locks

## How to run / verify
```bash
cd packages/shared
python -m pytest tests/test_agents/test_critic.py tests/test_agents/test_graph.py -q
```

Manual rehearsal (already run):
- `retail mortgage` → veto purpose, replan=2, outcome vetoed, critic passed
- `tin chap veto` → veto purpose, outcome vetoed
- `tin chap luong` → no veto, stp_approved, critic skipped (lane 1)

## Contract impact
None.

## Follow-ups / TODO
- [ ] Show Critic memo/remediation on assess UI
- [ ] Clean mortgage seed without purpose contradiction for HITL-without-veto demo

## Gotchas
Critic still must not mutate other agents. Do not add `memo` back to `prose_fields` unless numbers are removed from memo text.
