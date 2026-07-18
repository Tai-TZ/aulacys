<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Wow-flow UI Phase A–C

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** local — not opened yet
- **Status:** ✅ Done

## What changed & why

Shipped the planned UI polish for the retail wow flow: clearer assess narrative
(tabs + veto alert + timeline money shot), HITL approvals UX (empty state,
reject confirm dialog, ticket feedback), shadcn-style primitives **without new
npm deps**, and customer-portal Agent tab wired to live `POST /assess` trace
with animation fallback when API is down.

## Files touched

- `apps/web/components/ui/{badge,alert,dialog,tabs,separator,scroll-area}.tsx` + `index.ts` — primitives (cva / native `<dialog>`, no Radix)
- `apps/web/components/admin/node-timeline.tsx` — shared harness timeline (veto / replan tones)
- `apps/web/components/admin/assess-dashboard.tsx` — Tabs Hồ sơ|Kết quả, Alert/Badge, NodeTimeline
- `apps/web/app/admin/approvals/page.tsx` — Badge/Alert + reject Dialog
- `apps/web/lib/trace-to-steps.ts` — map `AssessResponse.trace` → DAG step statuses
- `apps/web/components/client/workspace/workspace-page.tsx` — Agent tab: parallel `sendChat` + `assess`, live steps
- `apps/web/lib/i18n/dictionaries.ts` — `agentProcessOffline` / `agentProcessLive`

## How to run / verify

```bash
cd apps/web && npm run build   # green
# API :8000 + web :3000

# Admin wow path
# /admin/login → admin@aulacys.demo / admin123
# /admin → Mortgage (veto) → Chạy thẩm định → tab Kết quả → compliance đỏ
# → Mở Người phê duyệt → Phê duyệt / Từ chối (dialog)

# Customer live trace
# /customer-portal → Agent → mention "mortgage" or "veto"
# → process panel: "Live trace từ /assess" + step statuses from harness
# Stop API → send again → offline banner + demo animation
```

## Contract impact

none (frontend-only; still uses existing `AssessResponse` / approvals)

## Follow-ups / TODO

- [ ] Persist HITL queue in DB (still sessionStorage)
- [ ] Optional TanStack Query if we add poll/gateway status on this path
- [ ] Admin case list / agent manager pages still out of slice

## Gotchas

- No new npm packages — Dialog is native `<dialog>`, not Radix.
- Customer portal still chats via `/chat`; process panel uses `/assess` (message seed). Mortgage keywords force `assess("retail mortgage")` for the veto demo.
- HITL queue key `shb.hitl.queue` — per browser tab session.
