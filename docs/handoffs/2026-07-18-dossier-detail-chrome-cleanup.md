<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Dossier detail chrome cleanup

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** feat/admin_page → develop (#30)
- **Status:** ✅ Done

## What changed & why

Bộ hồ sơ detail was still cluttered: header search, a redundant customer CTA panel (name + amount + “Chạy lại”), and “Mã hồ sơ” competing with the primary action. Search is gone from the admin header; the CTA button sits top-right (old mã vị trí); mã lives in the summary banner; agent progress/timeline use a vertical connected timeline with progress bar and tool chips.

## Files touched

- `apps/web/components/admin/admin-shell.tsx` — remove header search box
- `apps/web/components/admin/assess-dashboard.tsx` — top-right Tiếp nhận/Chạy lại; drop mid-page CTA panel; pass `dossierCode` into `DossierSummaryCard`
- `apps/web/components/admin/node-timeline.tsx` — vertical timeline + tool chips + veto/replan badges
- `apps/web/components/admin/agent-run-progress.tsx` — progress bar + live step list while assess runs

## How to run / verify

```bash
cd apps/web && npx tsc --noEmit
# optional: npm run dev → /admin/bo-ho-so → open a dossier
```

Manual: no search in admin header; back left + Tiếp nhận/Chạy lại right; no customer name CTA card; “Mã hồ sơ” in “Thông tin tiếp nhận hồ sơ & Gói vay đề nghị”; while loading, vertical AgentRunProgress; after run, NodeTimeline chips.

## Contract impact

none

## Follow-ups / TODO

- [ ] Tokenize leftover hex in list/preview chips if still present
- [ ] Split `assess-dashboard.tsx` when it grows further

## Gotchas

- List view still has its own search (`searchQuery` in assess-dashboard) — only the **shell** header search was removed.
- Button label: “Tiếp nhận” before first run, “Chạy lại” after `result`, “Đang xử lý…” while loading.
- `dossierCode` falls back to `SHB-{SCENARIO}-2026` when no `applicationId`.
