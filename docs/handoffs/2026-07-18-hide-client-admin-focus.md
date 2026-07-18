<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Hide client routes (admin-only demo)

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** local
- **Status:** ✅ Done

## What changed & why

Demo focus is admin only. Client-facing routes now redirect to `/admin`. Removed “Trang khách hàng” from admin sidebar. Component source under `components/client/` is kept (BrandMark still used by admin) but not reachable via URL.

## Files touched

- `apps/web/app/page.tsx`, `customer-portal/`, `workspace/`, `dang-ky/`, `dang-nhap/`, `vay/[slug]/` — redirect → `/admin`
- `apps/web/components/admin/admin-shell.tsx` — drop customer link; BrandMark → `/admin`

## How to run / verify

```bash
# open http://localhost:3000/ → lands on /admin
# /customer-portal, /dang-ky, /vay/mua-nha → /admin
```

## Contract impact

none

## Follow-ups / TODO

- [ ] Delete unused `components/client/*` pages later if team drops client entirely
- [ ] Uncommitted customer-portal polish still on branch — can ship with this or separate

## Gotchas

- Redirect only — files in `components/client/` still exist; do not assume deleted.
