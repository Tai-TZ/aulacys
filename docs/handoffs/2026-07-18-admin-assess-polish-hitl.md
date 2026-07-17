# Handoff — Assess polish + HITL approver page

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** `feat/admin-assess-polish-hitl` → `develop`
- **Status:** ✅ Done

## What changed & why

Wow-flow tail: after assess, a human must decide. Polished **Chạy thẩm định** (errors, unverified badge, tín chấp preset, CTA) and shipped **Người phê duyệt** (`/admin/approvals`) wired to `POST /api/v1/approvals` → `write_approval_ticket`. Other sidebar items marked **Sắp có**. Plan was committed before code (see first commit on branch).

## Files touched

- `apps/api/src/models/schemas.py` — `ApprovalRequest` / `ApprovalResponse`
- `apps/api/src/api/routes.py` — `POST /approvals`
- `apps/api/tests/test_api/test_routes.py` — approve/reject tests
- `apps/web/lib/api.ts` — typed violations + `submitApproval`
- `apps/web/lib/hitl-queue.ts` — sessionStorage queue
- `apps/web/components/admin/admin-shell.tsx` — nav live vs stub
- `apps/web/components/admin/assess-dashboard.tsx` — polish
- `apps/web/app/admin/page.tsx`, `app/admin/approvals/page.tsx`

## How to run / verify

```bash
# API (empty DATABASE_URL if local .env has placeholder pooler URL)
cd apps/api
$env:DATABASE_URL=""; $env:DIRECT_URL=""
pytest tests/test_api/test_routes.py -q

cd ../web && npm run build

# Manual
# :8000 API + :3000 web
# /admin → Nạp tín chấp → Chạy thẩm định → Mở Người phê duyệt → Phê duyệt
# /admin → mortgage → veto + unverified badge on prohibited_purpose
```

## Contract impact

**Changed.** Added `ApprovalRequest` / `ApprovalResponse`. Mirrored in `apps/web/lib/api.ts`.

## Follow-ups / TODO

- [ ] Persist HITL queue in DB instead of sessionStorage
- [ ] Wire `signed_by` into audit ledger
- [ ] Hồ sơ / agent / cấu hình pages still out of slice

## Gotchas

- Queue is per-browser tab session — refresh keeps it; new browser = empty.
- Local `apps/api/.env` copied from example can set a fake `DATABASE_URL` and break `test_db` (reports `down` not `disabled`). Unrelated to this slice.
- Stub nav items are non-links with "Sắp có" — intentional.
