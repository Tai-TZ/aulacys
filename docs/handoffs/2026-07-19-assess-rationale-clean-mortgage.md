<!--
Handoff = the note the NEXT person/agent reads before touching this area.
-->
# Handoff — Assess rationale UI + clean mortgage seed

- **Date:** 2026-07-19
- **Author:** Cursor agent
- **Branch / PR:** `feat/assess-rationale-clean-mortgage-seed` → develop (PR TBD)
- **Status:** ✅ Done (awaiting commit/PR)

## What changed & why
Demo assess dashboard now surfaces agent **rationale** (Credit / Ops / Compliance) and **Critic** memo/rejections/remediation next to the LoanProposal card. Mortgage seed is split: default `retail mortgage` is a **clean HITL** path (purpose matches, gate never STP); add `veto`/`bad` for the wow purpose-contradiction path. UI mock dossiers match (`mortgage` + `mortgage-veto`; unsecured HITL product label fixed).

Also fast-forwarded Critic harden from `feat/critic-evidence-harden` onto this branch.

## Files touched
- `apps/web/components/admin/assess-dashboard.tsx` — rationale/Critic card; clean `MORTGAGE_DEMO`; `MORTGAGE_VETO_DEMO`; mock dossier list + `SCENARIO_META`
- `packages/shared/aulacys/agents/graph.py` — `_MORTGAGE_HITL` / `_MORTGAGE_VETO` + seed routing
- `packages/shared/tests/test_agents/test_graph.py` — veto query `retail mortgage veto`; new clean HITL test
- `packages/shared/aulacys/agents/nodes/critic.py` (+ tests/handoff) — via merge from Critic harden

## How to run / verify
```bash
cd packages/shared
python -m pytest tests/test_agents/ -q
# expect 92 passed

cd apps/web
npm run build
```

Manual:
- Query / form `retail mortgage` → `outcome=ready_for_human_approval`, no purpose veto
- Query `retail mortgage veto` → blocking purpose veto → replan → `vetoed`
- Assess UI: after run, see proposal + “Lý do agent & Critic” card

## Contract impact
None (`AssessResponse` already had `rationale` / `critic`).

## Follow-ups / TODO
- [ ] Commit + open PR into `develop`
- [ ] Optional: wire unused `runSeedDemo` buttons or remove dead helper
- [ ] Confirm Critic PR #45 merged or supersede via this PR

## Gotchas
- Seed keyword: mortgage alone = clean HITL; must include `veto` or `bad` for wow path.
- Ticket `status` mirrors outcome string (`ready_for_human_approval`), not `pending_human`.
- UI primary path is `assessApplication(form JSON)` — mock dossier documents must stay aligned with graph seeds.
