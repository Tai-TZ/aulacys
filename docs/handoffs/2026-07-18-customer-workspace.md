<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Customer loan workspace

- **Date:** 2026-07-18
- **Author:** Tai / Cursor agent
- **Branch / PR:** local — not opened yet
- **Status:** ✅ Done

## What changed & why

Added a retail customer **workspace** at `/workspace` after demo đăng ký / đăng nhập. Four tabs map to the loan journey + Digital Expert story: Dashboard (indicative limits, DTI, repayment bars, agent pipeline), Hồ sơ (doc checklist tied to Credit/Ops/Compliance/LTV), Lịch sử vay, and Agent hỗ trợ (chat via `sendChat` + fallback). Seeded demo data only — no real auth/API contract change.

## Files touched

- `apps/web/app/workspace/page.tsx`, `loading.tsx`
- `apps/web/components/client/workspace/workspace-page.tsx` — shell + 4 tabs
- `apps/web/components/client/workspace/charts.tsx` — SVG bars/gauge (no chart lib)
- `apps/web/lib/workspace-demo.ts` — seeded limits / dossier / history / pipeline
- `apps/web/lib/demo-session.ts` — localStorage demo session
- `apps/web/components/client/auth-page.tsx` — save session → redirect `/workspace`
- `apps/web/components/client/client-nav.tsx` — link “Vào workspace”
- `apps/web/lib/i18n/dictionaries.ts` — `workspace.*` VI/EN

## How to run / verify

```bash
cd apps/web
npm run lint
npm run build
npm run dev
# 1) http://localhost:3000/dang-ky → submit → lands on /workspace
# 2) Or open http://localhost:3000/workspace directly
```

Expected:
- Tabs switch: Dashboard / Hồ sơ / Lịch sử / Agent
- Pipeline shows Compliance waiting on valuation (veto-gate narrative)
- Agent chat works or shows fallback copy
- No new npm dependencies

## Contract impact

none — chat still uses existing `sendChat` / `ChatRequest`.

## Follow-ups / TODO

- [ ] Wire upload buttons to real storage / assess API when ready
- [ ] Optional: deep-link `?tab=agent` from landing chatbot
- [ ] Replace seeded CIF with Supabase customer when auth exists

## Gotchas

- Demo session is **localStorage** (`aulacys-demo-session`) — not secure auth.
- Numbers on Dashboard are **illustrative**; copy states they come from tools in the real system (AGENTS.md rule 1).
- Charts are hand-rolled SVG — do not add Chart.js/Recharts without team approval.
