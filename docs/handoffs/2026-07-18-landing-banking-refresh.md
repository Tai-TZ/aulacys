<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
Copy this file to docs/handoffs/YYYY-MM-DD-<slug>.md and fill it in.
-->
# Handoff — Landing modern banking refresh

- **Date:** 2026-07-18
- **Author:** Tai / Cursor agent
- **Branch / PR:** local — not opened yet
- **Status:** ✅ Done

## What changed & why

Replaced the cream / Corporate-Memphis two-column hero with a full-bleed lifestyle photo hero, cooler banking palette, and CSS-only motion (entrance stagger, Ken Burns zoom, scroll reveal, button shimmer). Goal: less “AI industrial”, more retail-banking trust — without new npm deps.

## Files touched

- `apps/web/app/globals.css` — cooler tokens (`background`/`cream` → cool gray), navy hero overlay, motion keyframes (`.animate-fade-up`, `.animate-hero-zoom`, `.reveal`, `.btn-shimmer`)
- `apps/web/components/client/landing-page.tsx` — full-bleed `/shb/loan-hero.jpg` hero, brand-first copy, trust strip below fold, product links without cards, scroll `Reveal`, dark process section
- `apps/web/components/client/reveal.tsx` — IntersectionObserver reveal helper (`prefers-reduced-motion` respected)
- `apps/web/components/client/client-nav.tsx` — real `/shb/logo.svg`, tighter banking nav chrome

## How to run / verify

```bash
cd apps/web
npm run lint
npm run build
npm run dev
# open http://localhost:3000/
```

Expected:
- Hero is edge-to-edge photo + navy overlay; large **Aulacys** wordmark, then headline + CTAs (no pill badge / trust chips in first viewport)
- Content fades up on load; sections reveal on scroll; primary buttons shimmer on hover
- Calculator sits below trust strip (not overlapping cream hero)
- `npm run lint` + `npm run build` green

## Contract impact

none — `schemas.py` / `apps/web/lib/api.ts` untouched. No new dependencies.

## Follow-ups / TODO

- [ ] Replace Memphis `help-*.png` / `steps.png` with photography or simpler diagrams when assets are ready
- [ ] Optional: lighter mobile hero crop (`object-position`) if faces clip on small screens
- [ ] Commit when ready: `feat(web): modern banking landing motion`

## Gotchas

- Hero asset is **`/aulacys/hero.jpg`** (modern banking lounge). Brand assets live under `public/aulacys/` — `public/shb/` removed.
- Motion is CSS-only — do **not** add framer-motion without a team decision (`AGENTS.md` §1).
- `bg-hero-overlay` comes from `--background-image-hero-overlay` in `@theme inline`.
- Logos: `/aulacys/logo.svg` (light) and `/aulacys/logo-on-dark.svg` (footer/admin).
