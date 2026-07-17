# Handoff — SHB loan-inspired Digital Expert UI

- **Date:** 2026-07-17
- **Author:** Codex
- **Branch / PR:** working tree (no PR created)
- **Status:** ✅ Done

## What changed & why
Rebuilt the single frontend screen to closely match the public SHB loan page's visual language while keeping the hackathon's corporate-loan expert-agent flow. The page now has SHB's two-level navigation, branded hero and need cards, solution cards, an agent request panel, support cards, and a compact footer. Public reference assets are stored locally so the demo does not depend on the SHB CDN.

## Files touched
- `apps/web/app/page.tsx` — replaced the generic chat with the SHB-styled responsive landing/demo page and retained the existing `sendChat` integration with a safe fallback.
- `apps/web/app/globals.css` — updated semantic tokens for the SHB orange/navy palette, typography, radius, and hero overlay.
- `apps/web/app/layout.tsx` — set Vietnamese document language and useful SHB Digital Expert metadata.
- `apps/web/public/shb/logo.svg` — local public SHB logo asset used by header/footer.
- `apps/web/public/shb/loan-hero.jpg` — local hero asset from the public reference page.
- `apps/web/public/shb/loan-calculator.jpg` — local reference asset reserved for subsequent calculator expansion.

## How to run / verify
```powershell
cd apps/web
npm.cmd ci
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```
Expected: lint reports no warnings/errors, build compiles and statically generates `/`, and the page is available at `http://localhost:3000`.

## Contract impact
None. `apps/api/src/models/schemas.py` and `apps/web/lib/api.ts` were not changed.

## Follow-ups / TODO
- [ ] Connect currently decorative header/support actions if those flows enter scope.
- [ ] Upgrade the locked Next.js dependency after team approval; `npm ci` reports known vulnerabilities in the current lockfile.

## Gotchas
The page intentionally adapts the reference consumer-loan UI to the project's corporate-loan demo instead of reproducing SHB's consumer product content. Brand assets came from the public SHB CDN and are checked into `public/shb` for offline demo reliability.
