<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Aulacys brand assets (remove SHB)

- **Date:** 2026-07-18
- **Author:** Tai / Cursor agent
- **Branch / PR:** local — not opened yet
- **Status:** ✅ Done

## What changed & why

Replaced SHB logo/copy on client + admin UI with Aulacys branding. New full-bleed hero (`/aulacys/hero.jpg` — banking lounge / city glass). Removed `public/shb/` entirely (old SHB logo, family stock, unused calculator render, Memphis hero.png).

## Files touched

- `apps/web/public/aulacys/` — `logo.svg`, `logo-on-dark.svg`, `hero.jpg`, help-1/2/3, steps
- Deleted `apps/web/public/shb/`
- `client-nav`, `landing-page`, `loan-chatbot`, `auth-page`, `admin/page`, `products.ts`, `dictionaries.ts` — paths + SHB → Aulacys strings

## How to run / verify

```bash
cd apps/web && npm run lint && npm run dev
# http://localhost:3000 — nav logo Aulacys, chatbot "Hỏi Aulacys ngay", no SHB
```

## Contract impact

none

## Follow-ups / TODO

- [ ] Swap Memphis `help-*.png` / `steps.png` when better Aulacys visuals exist
- [ ] Optional: compress `hero.jpg` (~2MB) for faster LCP

## Gotchas

- Grep `SHB` / `/shb/` under `apps/web` should return empty.
- Brand identity is **text only** via `BrandMark` (`components/client/brand-mark.tsx`) — no logo/hero image files. Orange **A** + navy/white “ulacys”.
- Content illustrations (`help-*.png`, `steps.png`) may still live under `public/aulacys/` for product/why sections.
