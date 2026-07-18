# Handoff - Obsolete Docs Cleanup

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `codex/docs-lifecycle-agent-spec` -> `develop` | #36
- **Status:** Done

## What changed & why
Removed obsolete top-level process and analysis docs that were pulling the team back toward the old corporate 20bn scenario, generic single-agent architecture, or superseded pickup plans. Updated active docs so they point at the current retail five-agent lifecycle contract instead of deleted drafts.

## Files touched
- `docs/SHB-Digital-Expert-Agents-Solution-Design.md` - deleted; v1 corporate analysis is no longer active.
- `docs/architecture_diagram.md` - deleted; generic single-agent diagram was stale.
- `docs/FLOW-PROCESS-LOAN.md`, `docs/FLOW-BUSINESS-REVIEW.md`, `docs/PLAN-LOAN-LIFECYCLE.md` - deleted; replaced by `FLOW-BUSINESS-CONFIRMED.md`, `LOAN-SOP.md`, `AGENT-SPEC.md`, and lifecycle architecture.
- `docs/CODING-PLAN.md`, `docs/NEXT-STEPS.md`, `docs/DOC-AUDIT.md` - deleted; superseded by current service/agent/lifecycle docs.
- `AGENTS.md`, `docs/00-START-HERE.md`, `docs/BUILD-GUIDE.md`, `docs/TEAM_RULES.md` - aligned references and decisions with retail scope + Gemini model policy.
- `docs/FLOW-BUSINESS-CONFIRMED.md`, `docs/LOAN-SOP.md`, `docs/MICROSERVICES-STATUS.md`, `docs/SERVICE-CODING-PLAN.md`, `docs/PRODUCTION-READINESS.md`, `docs/SHB-Digital-Expert-Agents-Solution-Design-v2.md` - removed links to deleted/stale docs.

## How to run / verify
```powershell
rg -n "FLOW-PROCESS-LOAN|FLOW-BUSINESS-REVIEW|PLAN-LOAN-LIFECYCLE|SHB-Digital-Expert-Agents-Solution-Design\.md|architecture_diagram|CODING-PLAN|NEXT-STEPS|DOC-AUDIT|gpt-4o-mini|Opus|Haiku" AGENTS.md README.md docs -g "*.md" -g "AGENTS.md" -g "!docs/handoffs/**"
git diff --check
```
Expected: no active references to deleted docs. `MODEL_NAME=gpt-4o-mini` in `CONFIG.md` is acceptable because it is documented as OpenAI fallback only.

## Contract impact
None. No API schema or frontend contract files changed.

## Follow-ups / TODO
- [ ] Keep handoffs as historical logs; do not bulk-edit old handoff links unless a release doc requires it.
- [ ] Review whether `PRODUCTION-READINESS.md` still reflects current code after the next backend audit.

## Gotchas
The v1 solution design is gone from active docs on purpose. If someone needs it for archaeology, use Git history; do not restore it as a live reference.
