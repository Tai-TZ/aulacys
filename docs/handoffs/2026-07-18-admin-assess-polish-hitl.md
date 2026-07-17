# Handoff — Plan: polish assess + HITL approver page

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** `feat/admin-assess-polish-hitl` → `develop`
- **Status:** 🔄 WIP (plan committed first per team process; implementation follows)

## What changed & why

Pre-implementation plan for the user ask: (2) polish **Chạy thẩm định**, (3) one real admin page. After reading `AGENTS.md` §0, `BUILD-GUIDE.md` §5/§8, and `CODING-PLAN.md`, the wow-flow tail is **human approves → ticket written**. So page (3) = **Người phê duyệt** (`/admin/approvals`), not hồ sơ/agent/cấu hình (those stay stub-badged).

## Flow (source of truth)

```
Loan form → POST /assess/application → Planner → Credit∥Ops → Compliance
  → veto? → replan (cap 2) → Critic (lane 3) → outcome + ticket
  → HITL (this slice) → POST /approvals → write_approval_ticket (human signed)
```

Monitor is the product (`BUILD-GUIDE` §8.1). Sidebar stubs must not look live.

## Slice plan (3–5 steps)

1. **Polish assess UI:** clearer API errors; badge `unverified` on violations; CTA → `/admin/approvals`; push case into `sessionStorage` queue after each run.
2. **Contract:** `ApprovalRequest` / `ApprovalResponse` in `schemas.py` + `api.ts`.
3. **Route:** `POST /api/v1/approvals` → `write_approval_ticket` with `approved`/`rejected` + `signed_by` (demo-proof; no DB required).
4. **Page:** `/admin/approvals` — list pending from session queue; Approve/Reject; show new ticket.
5. **Nav:** wire Người phê duyệt; mark other sidebar items "Sắp có".

## Out of scope

- Full case CRM / agent admin / settings pages
- Production RBAC / real LOS
- RAG (P1.4)

## Files (intended)

- `apps/api/src/models/schemas.py`, `apps/api/src/api/routes.py`, tests
- `apps/web/lib/api.ts`, `components/admin/*`, `app/admin/page.tsx`, `app/admin/approvals/page.tsx`
- This handoff (updated to Done after impl)

## How to verify (after impl)

```bash
cd apps/api && pytest -q
cd apps/web && npm run build
# /admin → Chạy thẩm định → open /admin/approvals → Approve
```

## Contract impact

Will add `ApprovalRequest` / `ApprovalResponse` (announced when coded).

## Gotchas

- Mortgage default still vetoes; approver can still decide (escalate path).
- Unsecured seed → `ready_for_human_approval` is the clean HITL demo.
- Queue is browser `sessionStorage` — demo-only, not multi-user.
