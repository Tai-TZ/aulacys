# Handoff — Client and admin route split

- **Date:** 2026-07-17
- **Author:** Codex
- **Branch / PR:** working tree (no PR created)
- **Status:** ✅ Done

## What changed & why
Separated the frontend into explicit client and admin route folders without creating another Next.js project or duplicating dependencies. The SHB-style expert-agent experience now lives at `/client`; `/admin` provides a demo operations dashboard for loan cases and agent activity; `/` redirects to `/client` for backward compatibility.

## Files touched
- `apps/web/app/client/page.tsx` — client-facing SHB Digital Expert page, moved from the root route.
- `apps/web/app/admin/page.tsx` — responsive admin shell, summary cards, case table, and agent trace panel.
- `apps/web/app/page.tsx` — lightweight server-side redirect to `/client`.
- `apps/web/app/globals.css` — semantic status tokens shared by the admin dashboard.

## How to run / verify
```powershell
cd apps/web
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```
Expected: lint has no warnings/errors; build emits `/`, `/client`, and `/admin`; opening `/` redirects to `/client`.

## Contract impact
None. Backend schemas and `apps/web/lib/api.ts` were not changed.

## Follow-ups / TODO
- [ ] Connect `/admin` cards and table to persisted cases when an admin API contract is approved.
- [ ] Add real authentication/authorization before exposing admin outside a controlled demo.
- [ ] Replace placeholder admin links with nested routes only when those screens enter scope.

## Gotchas
Admin data is intentionally static demo data because this change only separates the UI structure and no admin API exists. Keep shared UI primitives in `apps/web/components/ui`; do not create separate dependency trees under the route folders.
