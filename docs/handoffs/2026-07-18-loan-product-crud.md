# Handoff — Loan product catalog CRUD

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** develop (local)
- **Status:** ✅ Done

## What changed & why

Admin “sản phẩm vay cá nhân” now has real CRUD against `apps/api` (`product_group` / `loan_product`). DB when `DATABASE_URL` set; in-memory seed fallback when DB disabled so demo never crashes. UI falls back to local mock if API unreachable.

## Files touched

- `apps/api/src/models/schemas.py` — catalog contract
- `apps/api/src/services/products.py` + `products_seed.py` — CRUD + seed
- `apps/api/src/api/routes.py` — REST endpoints
- `apps/api/tests/test_api/test_products.py`
- `apps/web/lib/api.ts` + `loan-products-map.ts`
- `apps/web/app/admin/san-pham/ca-nhan/page.tsx` — wired to API

## How to run / verify

```bash
cd apps/api && .\.venv\Scripts\python.exe -m pytest tests/test_api/test_products.py -q
# seed DB:
python -c "import asyncio; from src.services.products import seed_catalog, reset_memory_for_tests; reset_memory_for_tests(); print(asyncio.run(seed_catalog()))"
# or POST http://localhost:8000/api/v1/products/seed

cd apps/web && npm run build
# UI: http://localhost:3000/admin/san-pham/ca-nhan — label "Nguồn: API/DB"
```

## Contract impact

**Changed** `schemas.py` + `apps/web/lib/api.ts`:
- `GET/POST /api/v1/product-groups`, `PUT/DELETE /product-groups/{id}`
- `GET/POST /api/v1/products`, `GET/PUT/DELETE /products/{id}`, `PATCH /products/{id}/status`
- `POST /api/v1/products/seed`

## Follow-ups / TODO

- [ ] Soft-delete / audit trail for product changes
- [ ] Rich JSONB editors fully round-trip every form tab (partial today)

## Gotchas

- First list auto-seeds memory; call `/products/seed` to upsert Postgres.
- Duplicate `product_code` → 409. Delete group with products → 409.
