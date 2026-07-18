<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Admin UI Aulacys polish

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** local — not opened yet
- **Status:** ✅ Done

## What changed & why

Admin still showed SHB logo (`/shb/logo.svg`). Rebranded to Aulacys via shared `BrandMark` and polished shell + assess/approvals visuals (tokens only) so the monitor looks like product chrome, not a mock.

## Files touched

- `apps/web/components/admin/admin-shell.tsx` — BrandMark, navy gradient sidebar, mobile drawer, no SHB
- `apps/web/components/admin/assess-dashboard.tsx` — stat cards, empty timeline, card shadows
- `apps/web/app/admin/page.tsx` — eyebrow “Aulacys · Monitor”
- `apps/web/app/admin/approvals/page.tsx` — matching polish + eyebrow

## How to run / verify

```bash
cd apps/web && npm run build   # green
# npm run dev → http://localhost:3000/admin
# Sidebar: orange A + “ulacys”, no SHB logo
# /admin/approvals still loads; mobile menu opens on lg:hidden
```

## Contract impact

none

## Follow-ups / TODO

- [ ] Auth page (`auth-page.tsx`) still has SHB copy — separate slice if team wants
- [ ] Optional: delete leftover `public/shb/` if unused elsewhere

## Gotchas

- Brand is **text** (`BrandMark`), not an SVG under `/aulacys/logo.svg` (those files may not exist).
- Customer link from admin is `/` (landing), not `/client`.
- Search + logout remain disabled stubs.
