<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
Copy this file to docs/handoffs/YYYY-MM-DD-<slug>.md and fill it in.
-->
# Handoff — Product admin: DB only, no mock fallback

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** feat/catalog-crud-dossier-db
- **Status:** ✅ Done

## What changed & why
Admin `/admin/san-pham/ca-nhan` no longer seeds UI from `INITIAL_PRODUCTS` / mock local. Catalog always loads from API (`POST /products/seed` then list). Unsecured product seed segments + `loan_structure` now match the form checklist so edit form checkboxes populate from DB.

## Files touched
- `apps/web/app/admin/san-pham/ca-nhan/page.tsx` — empty state until API; no mock fallback; source badge database/memory
- `apps/web/components/admin/loan-products/product-form.tsx` — hydrate from `editingProduct`; disclaimer shows catalog source
- `apps/api/src/services/products_seed.py` — richer `IND_CONS_UNSECURED_01` + form-compatible segments
- `apps/web/components/admin/loan-products/mock-data.ts` — align unsecured mock segments (types/fixture only)

## How to run / verify
```bash
cd apps/api && make run
# another terminal
curl -X POST http://127.0.0.1:8000/api/v1/products/seed
curl "http://127.0.0.1:8000/api/v1/products?customer_type=INDIVIDUAL" | jq '.[] | select(.product_code=="IND_CONS_UNSECURED_01") | {segments, loan_structure}'
cd apps/web && npm run dev
# open /admin/san-pham/ca-nhan → subtitle "Nguồn: database"; edit unsecured → segments checked
```

## Contract impact
none

## Follow-ups / TODO
- [ ] Restart API after seed file changes (reload may miss if process stale)
- [ ] Optional: rename `mock-data.ts` → `types.ts` (still holds types + offline fixtures)

## Gotchas
- Seed upsert overwrites DB rows by `product_code`. Frontend only calls seed when catalog is **empty** — otherwise a stale uvicorn on :8000 can wipe richer seed data.
- Multiple processes listening on `:8000` is common on Windows after failed restarts; kill extras before relying on HTTP seed.
- Form SEGMENTS labels must match `segments` JSON in DB or checkboxes look empty even when API is live.
- Disclaimer is a legal/demo note, not a “mock UI” flag — source badge is the truth.
