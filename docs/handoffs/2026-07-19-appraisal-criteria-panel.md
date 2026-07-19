<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Stage-3 appraisal criteria report + Duyệt

- **Date:** 2026-07-19
- **Author:** agent (Cursor)
- **Branch / PR:** feat/catalog-crud-dossier-db → develop
- **Status:** ✅ Done

## What changed & why

Bước **Thẩm định** giờ hiển thị danh sách tiêu chí đã đối chiếu (policy / metric / Credit checks / CIC / Ops / KYC) kèm report chi tiết từng dòng và **trạng thái thẩm định**. Nút **Duyệt → Phê duyệt** chuyển stepper sang bước 4 và mở `/admin/approvals` (trừ khi Compliance veto cứng).

## Files touched

- `apps/web/components/admin/appraisal-criteria-panel.tsx` — panel dựng criteria từ `AssessResponse`
- `apps/web/components/admin/assess-dashboard.tsx` — gắn panel sau kết quả thẩm định; state `handedToApproval`; bước 4 chỉ active sau Duyệt
- `apps/web/lib/labels.ts` — thêm nhãn rule policy (DTI, LTV, CIC group, docs, …)

## How to run / verify

```bash
# API (orchestrator) + application-svc, rồi web
cd apps/web
npm run dev
# mở /admin/bo-ho-so → tiếp nhận → Credit → Chạy thẩm định
```

Expected: sau thẩm định thấy card **Báo cáo thẩm định theo tiêu chí**; bấm từng dòng xem chi tiết; **Duyệt → Phê duyệt** → URL `/admin/approvals` và bước 4 trên stepper thành active. Veto → nút Duyệt disabled.

Typecheck: `cd apps/web; npx tsc --noEmit` (green).

## Contract impact

none (chỉ UI; đọc shape `AssessResponse` / `rule_evidence` / `tool_results` đã có).

## Follow-ups / TODO

- [ ] Nếu backend chưa luôn trả `rule_evidence`, panel fallback sang violations + metric_report — có thể nhiễu; nên chuẩn hóa evidence từ Compliance node
- [ ] STP (`stp_approved`) vẫn cho Duyệt để điều hướng approvals — có thể ẩn nút khi đã STP nếu product muốn

## Gotchas

- Stepper **không** nhảy bước 4 ngay khi có `result`; phải bấm Duyệt (`handedToApproval`).
- CIC report vẫn nằm trong tiêu chí Credit (`cic_lookup`), không gắn lại bước tiếp nhận.
