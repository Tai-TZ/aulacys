# Handoff — Refactor Authentication Flow Trợ lý Vay vốn SHB

- **Date:** 2026-07-18
- **Author:** Antigravity (AI Agent)
- **Branch / PR:** feat/refactor-auth-ui -> develop
- **Status:** ✅ Done

## What changed & why
1. **Refactored `AuthPage` Component (`auth-page.tsx`)**:
   - Re-implemented the authentication logic to match the detailed Vietnames-localized flow for SHB Multi-Agent Loan Assistant.
   - Preserved all existing design tokens, layout styling, corner roundings, colors, and the brand-aligned split panel visual presentation.
   - Managed page navigation seamlessly via React state variables (`screen`).
2. **Registration Flow**:
   - **Họ và tên**: Required input checking for only whitespace, trimmed on validation.
   - **Ngày sinh**: Date picker validation ensuring user is at least 18 years old and DOB is not in the future.
   - **Số điện thoại**: Required field with prefix "+84" and VN number regex validation.
   - **Email**: Optional field validated only if entered.
   - **Mật khẩu**: Real-time validation checking complexity criteria (length, uppercase, lowercase, numeric, special characters) with a live-updating rules check list. Includes show/hide toggle.
   - **Xác nhận mật khẩu**: Confirm matching check.
   - **Trạng thái khách hàng SHB**: Mandatory selection ("Chưa là khách hàng" or "Đã là khách hàng SHB").
   - **Điều khoản**: Checkboxes for Terms and Privacy policies (mandatory) opening custom mock overlays, and marketing opt-in (optional, unchecked by default).
   - **Session retention**: Automatically serializes registration form details (excluding passwords) to `sessionStorage` on change and restores them on mount, allowing users to return without losing their inputs.
3. **OTP Screen**:
   - Discrete 6-digit numeric input with auto-focus, backspace-reverse focus, and clipboard pasting support.
   - 60-second countdown timer.
   - Resend link trigger resetting the countdown and clearing current inputs.
   - Valid OTP default value: `123456`.
4. **Success Screen**:
   - Done icon with quick routes to "Bắt đầu tư vấn vay" (routes to workspace) and "Về trang chủ".
5. **Login Screen**:
   - Basic phone number & password fields with eye toggle controls.
   - Validation checks against mock user: Phone `0912345678`, Password `Shb@123456`.
   - CAPTCHA and locks are excluded during standard login to simplify authentication, displaying errors inline on failure.
   - Development credentials helper box displayed only when `process.env.NODE_ENV === "development"`.
6. **Forgot Password Screen**:
   - Step 1: Input Phone (`0912345678` is registered).
   - Step 2: Validate OTP (`123456`).
   - Step 3: Set new password satisfying complexity standards. On success, redirects to Login with pre-filled phone number.

## Files touched
- [auth-page.tsx](file:///d:/aulacys/apps/web/components/client/auth-page.tsx) — Overhauled with mock flows.

## How to run / verify
1. Start development servers:
   ```bash
   .\scripts\stack.ps1 up -Profile demo
   ```
2. Navigate to [http://localhost:3000/dang-nhap](http://localhost:3000/dang-nhap) or [http://localhost:3000/dang-ky](http://localhost:3000/dang-ky) in your browser.
3. Verify all validation rules (e.g. DOB under 18 years, empty fields, password complexity checks, matching confirmations, SHB customer status checks).
4. Verify OTP flows by entering `123456` on registration or forgot password.
5. Verify success redirecting to `/workspace` upon completing the forms.
