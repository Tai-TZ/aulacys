<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Compact dossier detail UI

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** feat/admin_page → develop (uncommitted until asked)
- **Status:** ✅ Done

## What changed & why

Detail view on Bộ hồ sơ (`assess-dashboard` when a dossier is open) was noisy before any assess run: empty stats cards, a tall empty timeline column, and a mid-page CTA. Pre-run chrome is now hidden; CTA sits under the stepper; stepper/CTA/back use design tokens; the summary tip is one muted line.

## Files touched

- `apps/web/components/admin/assess-dashboard.tsx` — reorder detail layout; gate stats + timeline on `result`; tokenized stepper/CTA/back; shrink `DossierSummaryCard` tip; reduce empty-timeline padding

## How to run / verify

```bash
cd apps/web && npm run lint && npm run build
```

Manual: open `/admin/bo-ho-so` → pick a dossier → before run: back + stepper + CTA + left summary only (hint under CTA) → after “Chạy Thẩm Định”: stats + HITL banner + timeline appear.

Lint/build: green (pre-existing `@next/next/no-img-element` warnings only).

## Contract impact

none

## Follow-ups / TODO

- [ ] Tokenize remaining hex in `DossierPreviewCard` / list chips (`#e8650a`, `#c05000`) — out of scope this pass
- [ ] Split `assess-dashboard.tsx` / extract doc modal if the file keeps growing

## Gotchas

- Stats and Node timeline intentionally render **only when `result` is set**. Do not reintroduce always-on empty cards.
- Pre-run right column is gone; the one-line hint lives under the CTA card.
- Contract / form demo narrative in `DossierPreviewCard` was left intact on purpose.
