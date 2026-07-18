# Handoff - Lifecycle agent spec docs

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `codex/docs-lifecycle-agent-spec` -> `develop`
- **Status:** Done

## What Changed & Why
Updated the agent spec from a narrow 5-role underwriting-core contract into a lifecycle multi-agent contract. The new spec keeps the current Planner/Credit/Operations/Compliance/Critic core as Stage 3, but documents the target lifecycle around it: Intake, RM Proposal, Approval, and Disbursement. Added a shareable architecture doc for slides/team discussion.

## Files Touched
- `docs/AGENT-SPEC.md` - rewritten as the binding lifecycle multi-agent role/spec document.
- `docs/LIFECYCLE-MULTI-AGENT-ARCHITECTURE.md` - new shareable doc with lifecycle diagrams, stage ownership, service view, and build order.
- `docs/handoffs/2026-07-18-lifecycle-agent-spec-docs.md` - this handoff.

## How To Run / Verify
```bash
git diff --check -- docs/AGENT-SPEC.md docs/LIFECYCLE-MULTI-AGENT-ARCHITECTURE.md
```

Expected result: no whitespace errors. This is a docs-only slice; backend/frontend tests were not run.

## Contract Impact
None. No API schema or frontend type files were changed.

## Follow-Ups / TODO
- [ ] Implement `LoanProposal` / RM Proposal stage so proposal and underwriting are no longer folded into Credit.
- [ ] Implement explicit Approval Gate risk routing.
- [ ] Implement Disbursement Agent/service action for unsecured STP.
- [ ] Add real `knowledge-svc` namespaces for Credit/Compliance/Ops/Critic citations.

## Gotchas
The current code lives under `packages/shared/aulacys`, not the older `apps/api/src/agents` paths in some historical docs. `docs/AGENT-SPEC.md` is now target-state plus current-state; do not read it as saying RM Proposal/Disbursement are implemented today.
