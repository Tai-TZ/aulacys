# Handoff — Upgrade Loan Product Details & Unsecured Consumer Product

- **Date:** 2026-07-18
- **Author:** Antigravity AI
- **Branch / PR:** develop
- **Status:** ✅ Done

## What changed & why
1. **Upgraded Details Modal (`ProductPreview`):** Rebuilt the details modal to align with correct banking terms, showing four highlight metrics columns, 6 categorized sections, custom dynamic rendering (hiding empty sections, showing "Không áp dụng", closing on Escape).
2. **Added Unsecured Product (`IND_CONS_UNSECURED_01`):** Added the mock record for "Vay tiêu dùng không tài sản bảo đảm" (Vay tiêu dùng tín chấp) in `mock-data.ts`.
3. **Form & Preview Conditionals:**
   - Hidden Section 5 (Tài sản bảo đảm) in the preview modal for unsecured products.
   - Added Section 4 (Đối tượng và điều kiện) to display age ranges (22 to 70) and qualitative checklists.
   - Rendered "Phương thức cấp khoản vay" in the form as multiple checkboxes (Term Loan + Credit Limit) for unsecured products.
   - Rendered "3.1 Điều kiện sản phẩm tín chấp" inputs dynamically in the form when unsecured is chosen, hiding collateral settings.
   - Enabled flexible inputs (lenient validation allowing 0 or empty for minAmount/minTerm/interestRate) on unsecured records.
   - Configured document group list fallbacks to prevent runtime crashes when items lists are empty.

## Files touched
- [mock-data.ts](file:///d:/aulacys/apps/web/components/admin/loan-products/mock-data.ts) — Extended the `LoanProduct` interface with details parameters, and defined `prod-1` (secured) and `IND_CONS_UNSECURED_01` (unsecured) mock records.
- [product-list.tsx](file:///d:/aulacys/apps/web/components/admin/loan-products/product-list.tsx) — Rebuilt details preview, added conditions section, hid collateral section for unsecured items, updated table rows layout with tín chấp badges, and persistent state mapping.
- [product-form.tsx](file:///d:/aulacys/apps/web/components/admin/loan-products/product-form.tsx) — Rendered conditional inputs for secured vs unsecured, checkboxes for credit methods, adjusted validation logic, and synced detailed config properties on save.
- [page.tsx](file:///d:/aulacys/apps/web/app/admin/san-pham/ca-nhan/page.tsx) — Connected `onEdit` handler to trigger editing correctly.

## How to run / verify
```bash
# Verify typechecking and build compiles successfully
cd apps/web && npm run build
```
Verify manually on `http://localhost:3001/admin/san-pham/ca-nhan` by selecting "Xem chi tiết" (eye icon) on the newly added "Vay tiêu dùng không tài sản bảo đảm" product. Check highlight metrics, conditions, and document groups. Verify editing works by changing max term, saving, and verifying update.

## Contract impact
Extended `LoanProduct` in mock-data.ts. The changes are fully backwards-compatible as all new details parameters are declared as optional, and `product-list.tsx` implements fallback mappings for default products.

