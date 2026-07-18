<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
Copy this file to docs/handoffs/YYYY-MM-DD-<slug>.md and fill it in.
-->
# Handoff — Sync Upgraded Loan Fields with Edit/Create Form

- **Date:** 2026-07-18
- **Author:** Antigravity AI
- **Branch / PR:** develop
- **Status:** ✅ Done

## What changed & why
Synchronized the loan product editing and creation form (`IndividualLoanProductForm` in `product-form.tsx`) to match the corrected banking terminology (Số tiền vay, Phương thức cho vay, Phương thức trả nợ, Lãi suất từ). Also updated `handleSubmit` to extract, preserve, and dynamically synchronize edited form values into the nested rich details config parameters (ensuring detail configurations are never lost or wiped out when a product is saved).

In addition, synchronized terminology in filters and the product table headers in `product-list.tsx` ("Hạn mức" -> "Số tiền vay", filter options "Có tài sản bảo đảm (Secured)" -> "Có tài sản bảo đảm").

## Files touched
- [product-form.tsx](file:///d:/aulacys/apps/web/components/admin/loan-products/product-form.tsx) — Updated labels and values matching corrected terminology, and synchronized details configurations in `handleSubmit`.
- [product-list.tsx](file:///d:/aulacys/apps/web/components/admin/loan-products/product-list.tsx) — Changed table header to "Số tiền vay" and updated filter option terminology.

## How to run / verify
```bash
# Verify compilation checks
cd apps/web && npm run build
```
Verify manually on `http://localhost:3000/admin/san-pham/ca-nhan`:
1. Select "Chỉnh sửa" for the first product.
2. Verify all labels have been updated to matching Vietnamese terminology.
3. Modify the max amount and save.
4. Open the detail view ("Xem sản phẩm") for that product and verify that the updated values are correctly reflected and other configurations are intact.
