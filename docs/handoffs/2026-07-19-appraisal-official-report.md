# Handoff — Official appraisal report for HITL approvers

- **Date:** 2026-07-19
- **Author:** agent (Cursor)
- **Branch:** feat/catalog-crud-dossier-db
- **Status:** ✅ Done

## What changed & why

After thẩm định, officers and HITL approvers can open a **formal Vietnamese appraisal report** (layout inspired by `docs/reference/hop-dong-tin-dung-cho-vay-xe-o-to.pdf`: quốc hiệu, số văn bản, Điều 1–6, bảng tiêu chí, chữ ký). Report is stored on the HITL queue item so `/admin/approvals` can review before Phê duyệt / Từ chối. Print / Save as PDF via browser.

## Files touched

- `apps/web/lib/appraisal-report.ts` — build report payload from AssessResponse
- `apps/web/components/admin/appraisal-official-report.tsx` — sheet + dialog + print
- `apps/web/lib/hitl-queue.ts` — persist `report` on enqueue
- `apps/web/components/admin/appraisal-criteria-panel.tsx` — button Xem báo cáo
- `apps/web/components/admin/assess-dashboard.tsx` — wire dialog + richer enqueue meta
- `apps/web/app/admin/approvals/page.tsx` — Xem báo cáo for approver
- `apps/web/app/globals.css` — print styles for report sheet
- `docs/reference/hop-dong-tin-dung-cho-vay-xe-o-to.pdf` — layout reference copy

## How to run / verify

1. Chạy thẩm định trên `/admin/bo-ho-so`
2. Bấm **Xem báo cáo thẩm định** → thấy layout chuẩn; **In / PDF**
3. Bấm **Duyệt → Phê duyệt** → `/admin/approvals` → lại **Xem báo cáo thẩm định** rồi Phê duyệt

Hồ sơ HITL cũ (trước thay đổi) không có `report` — chạy lại thẩm định.

## Contract impact

none (sessionStorage payload only)

## Follow-ups / TODO

- [ ] Optional: server-side PDF generation (reportlab) if demo needs downloadable file without browser print

## Gotchas

- Report lives in `sessionStorage` with the HITL case — same tab only.
- Print CSS hides everything except `.appraisal-report-sheet`.
