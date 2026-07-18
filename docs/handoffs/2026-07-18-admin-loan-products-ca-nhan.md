# Handoff — Phân loại Đối tượng khách hàng và Quản lý Sản phẩm Vay cá nhân

- **Date:** 2026-07-18
- **Author:** Antigravity (AI Agent)
- **Branch / PR:** feat/admin-loan-products -> develop
- **Status:** ✅ Done

## What changed & why
1. **Sidebar Navigation Update (`admin-shell.tsx`)**:
   - Replaced "Sản phẩm vay" single link with a collapsible dropdown menu containing "Khách hàng cá nhân" and "Khách hàng doanh nghiệp".
   - "Khách hàng cá nhân" is fully live and clickable (links to `/admin/san-pham/ca-nhan`).
   - "Khách hàng doanh nghiệp" is disabled/unclickable and displays a "Sắp triển khai" badge to show readiness for future expansion.
   - Refactored the full list of sidebar items according to the new specification (Tổng quan, Bộ hồ sơ, Quy trình xử lý, Quản lý Agent, Người dùng & phân quyền, Nhật ký hệ thống).
2. **Mock Data Generation (`loan-products/mock-data.ts`)**:
   - Built a complete local dataset for 9 loan products (Vay mua nhà đất thổ cư, Vay mua nhà dự án, Vay ô tô mới, Vay bổ sung vốn kinh doanh, Vay cầm cố sổ tiết kiệm, etc.) with `customerType: "INDIVIDUAL"`.
   - Setup initial 6 product groups (Vay nhà ở, Vay mua ô tô, Vay sản xuất kinh doanh, Vay tiêu dùng, Vay phục vụ học tập, Vay cầm cố tài sản).
3. **Product Listing & Overview View (`loan-products/product-list.tsx`)**:
   - **IndividualProductOverview**: Displays statistics card (Tổng nhóm sản phẩm, Tổng sản phẩm vay, Đang hoạt động, Bản nháp, Tạm ngừng).
   - **LoanProductGroupList**: Displays a dashboard style grid of large cards for each product group showing names, descriptions, icons, product counts, and dynamic previews.
   - **IndividualLoanProductTable**: Standard tabular list of products with codes, limits, terms, interest rates, status badges, and actions.
   - **IndividualLoanProductFilters**: Advanced collapsible filters panel filtering by group, secured status, status, custom segments, and search text.
   - **ProductGroupManagement**: A slide-out manager allowing admins to create groups, edit details, display orders, status, and validates deleting group block if it still contains child products.
   - **ProductPreview** & **ActivationConfirmDialog**: Custom detail view popup and status toggler modal.
4. **Form view (`loan-products/product-form.tsx`)**:
   - **ProductClassificationSection**: A mandatory classification section where "Đối tượng khách hàng" is locked to "Khách hàng cá nhân" and cannot be modified.
   - **CustomerSegmentSelect**: Checkbox selectors matching specific individual customer categories (Phổ thông, Ưu tiên, Hộ kinh doanh, Nhận lương, Tự doanh).
   - Includes standard sections: Thông tin chung, Cấu trúc khoản vay, Lãi suất và trả nợ, Điều kiện sơ bộ, Nội dung hiển thị, Cấu hình trạng thái.
5. **Admin Products Route (`app/admin/san-pham/ca-nhan/page.tsx`)**:
   - Integrated shell page wrapping listing, form editing/creation, overlays, and toasts with clean state transitions.

## Files touched
- [admin-shell.tsx](file:///d:/aulacys/apps/web/components/admin/admin-shell.tsx)
- [mock-data.ts](file:///d:/aulacys/apps/web/components/admin/loan-products/mock-data.ts)
- [product-list.tsx](file:///d:/aulacys/apps/web/components/admin/loan-products/product-list.tsx)
- [product-form.tsx](file:///d:/aulacys/apps/web/components/admin/loan-products/product-form.tsx)
- [page.tsx](file:///d:/aulacys/apps/web/app/admin/san-pham/ca-nhan/page.tsx)

## How to verify
1. Run server stack:
   ```bash
   .\scripts\stack.ps1 up -Profile demo
   ```
2. Open admin console: [http://localhost:3000/admin](http://localhost:3000/admin).
3. Click "Sản phẩm vay" -> "Khách hàng cá nhân" in the sidebar.
4. Verify stats cards, toggle between "Xem theo nhóm" and "Xem dạng danh sách".
5. Test filters (group, status, segments) and look up product details.
6. Click "Tạo sản phẩm vay cá nhân", input fields, verify segment checkboxes, and check the disabled locked customer field.
7. Click "Quản lý nhóm sản phẩm", try adding a group, editing details, or deleting a group.
