# Handoff — P0 layered audit/los + catalog-svc

- **Date:** 2026-07-18
- **Author:** agent
- **Branch / PR:** local (uncommitted) — commit when ready
- **Status:** ✅ Done

## What changed & why

Started the per-service coding plan (`docs/SERVICE-CODING-PLAN.md`):

1. **P0** — Refactored `audit-svc` and `los-svc` from single `main.py` into layered layout (`api` / `schemas` / `services` / `repositories` / `core`), kept HTTP contracts identical so the monolith seams still work. Added unit + route smoke tests. LOS gained `ticket_history` + `GET /tickets/{id}/history`.
2. **P1 start** — New `catalog-svc` (:8350) with 8 in-scope retail products, `config_hint` derivation, gateway `/catalog*` proxy, and compose block.

## Files touched

- `services/audit-svc/**` — layered app + tests + README + pydantic-settings
- `services/los-svc/**` — same; `ticket_history` table
- `services/catalog-svc/**` — new service (seed, layers, tests, Dockerfile)
- `services/api-gateway/app/main.py` — catalog in `/status` + `/catalog` proxies
- `docker-compose.services.yml` — `catalog-svc` + `CATALOG_SVC_URL`
- `services/README.md`, `docs/MICROSERVICES-STATUS.md` — inventory

## How to run / verify

```bash
cd services/audit-svc && pip install -r requirements.txt && pytest -q
# expect: 5 passed

cd services/los-svc && pip install -r requirements.txt && pytest -q
# expect: 3 passed

cd services/catalog-svc && pip install -r requirements.txt && pytest -q
# expect: 5 passed

uvicorn app.main:app --port 8350   # from services/catalog-svc
curl -s localhost:8350/health      # {"status":"ok","product_count":8}
curl -s localhost:8350/products/loan-1   # includes config_hint
```

Gateway (with catalog up):

```bash
# CATALOG_SVC_URL=http://127.0.0.1:8350
curl -s localhost:8080/catalog
curl -s localhost:8080/status   # includes catalog-svc row
```

Monolith assess path unchanged — audit/los URLs still work; `app/db.py` shims remain for back-compat.

## Contract impact

none on `apps/api/src/models/schemas.py` / `apps/web/lib/api.ts`.  
Gateway gained `/catalog`, `/catalog/categories`, `/catalog/products/{id}` (new surface for the web picker — wire `getCatalog()` next).

## Follow-ups / TODO

- [ ] Frontend product picker → `GET` gateway `/catalog` → submit `assess/application`
- [ ] One YAML per catalog SKU under `agents/products/` (today only `retail_mortgage` + `retail_unsecured_salary`; catalog maps via `graph_product`)
- [ ] Policy per-product LTV caps + property/cic seeds aligned to catalog
- [ ] Postgres + Alembic for audit/los (still SQLite behind `AUDIT_DB` / `LOS_DB`)
- [ ] Layer the remaining thin services (cic/aml/property/income/policy/gateway) the same way

## Gotchas

- Catalog seed is **hand-built** from the coding-plan matrix (`docs/data/message.txt` was missing). Replace with official SHB scrape later; keep `in_scope: false` for SME SKUs.
- `get_settings.cache_clear()` is required in tests after changing `AUDIT_DB` / `LOS_DB`.
- Out-of-scope products (`loan-6`) return **404** on `/products/{id}` even if present in seed.
- Gateway `/catalog` returns `{products:[], degraded:true}` when catalog-svc is down — never 500.
