# Handoff — Dossier Preview & Read-Only Banker Workspace

- **Date:** 2026-07-18
- **Author:** Antigravity (Gemini 3.5 Flash)
- **Branch / PR:** develop
- **Status:** ✅ Done

## What changed & why
Converted the banker retail loan application dashboard from an editable input form to a read-only viewer. Built a realistic dossier layout component (`DossierPreviewCard`) that mimics the actual printed SHBFinance paper loan application form. Added a clean Control Board card at the top allowing the banker to select kịch bản demo (Bé Hoa, Trần Vui, Huyền Trần), check simulation flags (Tier-3 confirmation), and execute the graph assessment. Added a high-fidelity popup modal to review attachments (CCCD, salary stub, CIC, and invoice evidence) by clicking document badges. Added a responsive 5-step wizard progress bar at the very top showing the lifecycle of the loan dossier: 1) Ingested, 2) Classified, 3) Appraisal (Graph), 4) Approved (HITL), 5) Disbursed. Implemented conditional dossier rendering: at the "Tiếp nhận hồ sơ" stage (before running the appraisal), the banker is shown a clean profile summary card (`DossierSummaryCard`) showing only the customer info, loan product package info, and clickable document attachments. Enabled "Bộ hồ sơ" sidebar link and created `/admin/bo-ho-so` page hosting the dossier applications table list complete with active status filter pills (All, Ingested, Pending, Approved, Vetoed) and search capabilities. Repurposed the home `/admin` path to display a beautiful high-level business OverviewDashboard.

## Files touched
- `apps/web/components/admin/assess-dashboard.tsx` — Replaced the large editable input form card with the new read-only `DossierPreviewCard` and top-level simulation Control Board. Escape all double quotes to comply with JSX eslint requirements. Implemented interactive popup preview modal showing customer CCCD, salary statements, and cic charts. Rendered a 5-step visual wizard progress bar at the top mapping active/completed states dynamically. Added `DossierSummaryCard` component and conditional dossier layout rendering. Added portfolio applications table list view with active search query and status filter row.
- `apps/web/components/admin/admin-shell.tsx` — Updated `AdminActiveHref` type definitions and enabled "Bộ hồ sơ" sidebar menu link.
- `apps/web/components/admin/overview-dashboard.tsx` — Created new general overview KPIs and product mix metrics layout page.
- `apps/web/app/admin/page.tsx` — Linked main `/admin` route to render `OverviewDashboard`.
- `apps/web/app/admin/bo-ho-so/page.tsx` — Linked new `/admin/bo-ho-so` route to render `AssessDashboard`.

## How to run / verify
1. Run development servers (API on `:8000`, Web on `:3000`).
2. Go to `http://localhost:3000/admin`. Verify that a beautiful system metrics overview dashboard is displayed.
3. Click "Bộ hồ sơ" in the sidebar menu or go to `http://localhost:3000/admin/bo-ho-so`. Verify that a table listing the 3 customer dossiers is displayed.
4. Try typing a query in the search input or clicking different status filter pills (e.g. "Tiếp nhận" showing all three by default).
5. Click "Xử lý hồ sơ" or anywhere on a row. Verify that the wizard progress bar and customer profile summary is displayed.
6. Click on any document badge under **Section 3: Hồ sơ tài liệu kèm theo** (e.g. `cccd`, `sao_ke_luong`, `cic` or `purpose_evidence`). Verify that a beautiful glassmorphism popup overlay opens, showing the document's image (e.g. the specific customer's CCCD card) and its OCR extracted metadata.
7. Click "Chạy Thẩm Định (API)" or "Seed tự động". Verify that the graph execution begins, the page renders the full paper contract layout (`DossierPreviewCard`), the wizard progress state updates dynamically (e.g. Step 3 becomes Green/Failed, and Step 4 waits for HITL approval), and the Node timeline trace populates on the right side.
8. Go back using the top link `← Quay lại danh sách bộ hồ sơ`. Verify that the status of the run application has updated dynamically (e.g. Bé Hoa now displays "Chờ xét duyệt" or "Đã giải ngân" depending on your approval actions).

## Contract impact
none.

## Follow-ups / TODO
- [ ] Connect the output of the compliance veto/HITL replanning to the approval workflow page when required.

## Gotchas
- The dossier preview card renders checkboxes dynamically based on the customer occupation and position keywords.
- Clickable document previews use native public path assets under `/public/aulacys/`.

