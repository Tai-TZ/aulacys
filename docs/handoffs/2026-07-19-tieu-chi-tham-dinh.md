# Handoff — Tiêu chí thẩm định (Evaluation Criteria) Management Page

- **Date:** 2026-07-19
- **Author:** Antigravity AI Agent
- **Branch / PR:** `feat/catalog-crud-dossier-db`
- **Status:** ✅ Done

## What changed & why
Added a dedicated page "Tiêu chí thẩm định" (Evaluation Criteria) under `/admin/tieu-chi` in the Next.js frontend, along with a menu item in the admin sidebar. Supported list view, threshold edits, override deletions (revert to defaults), and rule dry-run validation using simulated metric inputs. Scoped rules into "Dùng chung" (profile-level) vs "Riêng theo gói vay" (product code-level).

Polished the design to improve readability and aesthetics:
- Added top statistical summary metrics cards.
- Redesigned rule items as visually styled card lists with left color borders matching severity (blocking vs warning).
- Added sidebar filter option for "Quyền cấu hình" to quickly filter by "Tất cả tiêu chí", "Được phép sửa" (Appetite), or "Cố định (Không được sửa)" (Legal).

## Files touched
- `packages/shared/aulacys/policy/loader.py` — Implemented `delete_appetite_override` to revert customizations and clear cache.
- `services/orchestrator-svc/app/api/routes.py` — Registered `DELETE /policy/rules/{rule_id}` endpoint.
- `services/orchestrator-svc/tests/test_api/test_rule_engineer.py` — Added test cases for the logic and DELETE endpoint.
- `apps/web/lib/api.ts` — Added `deletePolicyAppetite` frontend API client function.
- `apps/web/components/admin/admin-shell.tsx` — Added the sidebar menu link and route type.
- `apps/web/app/admin/tieu-chi/page.tsx` — Built the polished rule-management page with summary widgets and permissions filter.

## How to run / verify
```bash
# Run backend tests
cd services/orchestrator-svc
..\..\apps\api\.venv\Scripts\python.exe -m pytest -v tests/test_api/test_rule_engineer.py

# Run frontend build
cd apps/web
npm run build
```

## Contract impact
None. Added the `DELETE /policy/rules/{rule_id}` endpoint which mirrors existing types.

## Follow-ups / TODO
- [ ] Add more validation cases to the "Thử rule demo" button as new rules are defined.

## Gotchas
- Deleting an appetite override resets it back to the baseline defined in the rule YAML files. It does not delete the rule itself.
