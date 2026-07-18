# Handoff — P0 assess input + live dashboard

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** `feat/p0-assess-input-dashboard` → `develop` (PR not opened yet)
- **Status:** ✅ Done

## What changed & why

P0 from `docs/CODING-PLAN.md`: stop being seed-only, make the monitor the product, and align docs with retail scope. Backend accepts a full loan JSON via `POST /api/v1/assess/application` (keeps message-based `/assess` for quick demos). Admin `/admin` now submits that body and renders lane, veto banner, replan count, node timeline, ticket/audit. `docs/00-START-HERE.md` no longer pitches the dead corporate 20bn scenario.

## Files touched

- `apps/api/src/models/schemas.py` — `AssessApplicationRequest` (mirrors `LoanApplication`)
- `apps/api/src/api/routes.py` — `POST /assess/application` + shared `_to_assess_response`
- `apps/api/tests/test_api/test_routes.py` — mortgage body → veto + unknown product 422
- `apps/web/lib/api.ts` — `DeclaredForm`, `DocumentInput`, `assessApplication()`
- `apps/web/components/admin/assess-dashboard.tsx` — form + live dashboard
- `apps/web/app/admin/page.tsx` — wire dashboard (drop mock corporate cases)
- `docs/00-START-HERE.md` — retail mortgage veto scenario
- `docs/CODING-PLAN.md` — (untracked at start; plan source, not edited for status)

## How to run / verify

```bash
# API
cd apps/api
D:\aiinovation\.venv\Scripts\python.exe -m ruff check src tests
D:\aiinovation\.venv\Scripts\python.exe -m pytest -q
# expect: 56 passed

# Web
cd apps/web
npm run build
# expect: /admin builds clean

# Manual
# start API :8000, open http://localhost:3000/admin
# click "Chạy thẩm định" (preloaded mortgage demo) → veto banner + 3× compliance in timeline
```

## Contract impact

**Changed.** Added `AssessApplicationRequest` in `schemas.py`; mirrored in `apps/web/lib/api.ts` (`assessApplication`). `AssessResponse` shape unchanged. Gateway still only proxies message `/assess` — full-application path is monolith-direct for now.

## Follow-ups / TODO

- [ ] P1.1 — verify policy thresholds (`verified: false` still on stage rules)
- [ ] P1.2 — `PolicyViolation.version` for audit
- [ ] Optional: gateway proxy for `/assess/application`
- [ ] `TEAM_RULES.md` Decisions row still logs corporate 20bn — update when team agrees (doc lag)

## Gotchas

- Graph already accepted `state["application"]`; route only needed to pass it through. Empty/missing application still falls back to `seed_application(query)`.
- Tier-3 confirm checkbox sets `confirmed_by: "officer-demo"` — demo UX, not OCR.
- Admin default form is the **veto** mortgage seed (purpose contradiction). Unsecured product will not veto.
- Do not reopen corporate 20bn as the wow flow — `AGENTS.md` §0 wins.
