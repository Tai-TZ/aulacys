# Handoff — Product catalog + application_document tables

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** develop (uncommitted locally)
- **Status:** ✅ Done (schema/models only — no product CRUD API yet)

## What changed & why

Persisted the two DB domains mapped from UI mock data: (1) admin loan-product catalog → `product_group` + `loan_product` in `apps/api`; (2) dossier checklist → `application_document` in `application-svc` (Section A intake tables were already there). Nested product configs stay JSONB so the admin form shape can round-trip without eight child tables. Agent YAML remains the graph source of truth via `agent_product_id`.

## Files touched

- `apps/api/src/db/models/product.py` — ORM for catalog
- `apps/api/src/db/models/__init__.py` — export models
- `apps/api/migrations/versions/0002_product_catalog.py` — Alembic
- `apps/api/tests/test_db/test_product_models.py` — metadata tests
- `docs/PRODUCT-CATALOG-SCHEMA.md` — DDL + ownership notes
- `docs/DATABASE.md` — table inventory
- `docs/APPLICATION-SCHEMA.md` — document table + plan row
- `services/application-svc/app/db/models.py` — `ApplicationDocument`
- `services/application-svc/migrations/versions/0002_application_document.py`
- `services/application-svc/schema.sql` — mirror DDL
- `services/application-svc/app/repositories/applications.py` — truncate order
- `services/application-svc/tests/test_document_model.py`

## How to run / verify

```bash
cd apps/api
.\.venv\Scripts\ruff.exe check src/ tests/
.\.venv\Scripts\python.exe -m pytest tests/ -q
# with DIRECT_URL set:
# alembic upgrade head   # applies 0002_product_catalog

cd ../services/application-svc
..\..\apps\api\.venv\Scripts\python.exe -m pytest tests/test_document_model.py -q
# with DATABASE_URL + schema application:
# alembic upgrade head   # applies 0002_application_document
```

Expected: `apps/api` **89 passed**; document model tests **3 passed**. Empty `DATABASE_URL` still demo-safe (DB disabled).

## Contract impact

none — no change to `schemas.py` / `apps/web/lib/api.ts`. Admin UI still uses in-memory mock; catalog-svc still uses JSON seed.

## Follow-ups / TODO

- [ ] Seed `product_group` / `loan_product` from `mock-data.ts` (or sync from catalog.json)
- [ ] Product CRUD API + wire admin `/admin/san-pham/ca-nhan` off mock
- [ ] Persist documents on `POST /applications` (schema + repository)
- [ ] Point catalog-svc at Postgres catalog (or deprecate JSON seed)

## Gotchas

- Two databases/owners: catalog lives in **monolith Supabase** (`apps/api`); intake in **application-svc** schema `application`. Do not duplicate intake tables into `apps/api`.
- `loan_product.agent_product_id` must match a file under `agents/products/*.yaml` — catalog does not replace YAML agents/tools/gate.
- Nested configs are JSONB (deliberate hackathon choice); normalize later only if you need SQL filters on those fields.
