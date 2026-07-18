# Handoff — Product admin display cleanup

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** current working branch
- **Status:** ✅ Done

## What changed & why
The product-group icon selector now displays Vietnamese-only text as requested. The product list also hides the product-code column while retaining product codes in application data. Internal identifiers therefore continue to support view, edit, and status actions.

## Files touched
- `apps/web/components/admin/loan-products/product-list.tsx` — removed English icon labels and hid the product-code header and row cells from the product table.

## How to run / verify
```bash
cd apps/web
npm.cmd run lint
npm.cmd run build
```
Both commands pass. Existing `next/no-img-element` warnings remain in `components/admin/assess-dashboard.tsx`.

## Contract impact
None. No API schema or frontend API type changed.

## Follow-ups / TODO
- [ ] None for this display-only change.

## Gotchas
Keep the option `value` fields (`Home`, `Car`, `Briefcase`, `ShoppingBag`, `GraduationCap`, `Key`) and each product's `productCode` in data because they are stable technical identifiers. Only their visible presentation was changed.
