# Handoff - Lifecycle agent spec docs

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `codex/docs-lifecycle-agent-spec` -> `develop`
- **Status:** Done

## What Changed & Why
Updated the agent spec to describe a loan lifecycle powered by the existing five-agent core, without adding one agent per lifecycle stage. The new spec focuses on what each current agent does, what it reads/calls, and what it outputs. It also clarifies that proposal, approval, and disbursement should first be schemas/deterministic stages, not new LLM agents.

## Files Touched
- `docs/AGENT-SPEC.md` - rewritten as the binding five-agent role/output contract.
- `docs/LIFECYCLE-MULTI-AGENT-ARCHITECTURE.md` - shareable doc explaining lifecycle stages around the five-agent core.
- `docs/handoffs/2026-07-18-lifecycle-agent-spec-docs.md` - this handoff.

## How To Run / Verify
```bash
git diff --check -- docs/AGENT-SPEC.md docs/LIFECYCLE-MULTI-AGENT-ARCHITECTURE.md
```

Expected result: no whitespace errors. This is a docs-only slice; backend/frontend tests were not run.

## Contract Impact
None. No API schema or frontend type files were changed.

## Follow-Ups / TODO
- [ ] Implement `LoanProposal` object/stage so proposal and underwriting are no longer blurred.
- [ ] Make Credit explicitly validate proposal reasonableness.
- [ ] Implement explicit deterministic Approval Gate risk routing.
- [ ] Implement deterministic DisbursementAction/service for unsecured STP.
- [ ] Add real `knowledge-svc` namespaces for Credit/Compliance/Ops/Critic citations.

## Gotchas
The current code lives under `packages/shared/aulacys`, not the older `apps/api/src/agents` paths in some historical docs. Do not add `RM Proposal Agent`, `Approval Agent`, or `Disbursement Agent` yet; the docs intentionally steer next work toward objects/gates/services first.
