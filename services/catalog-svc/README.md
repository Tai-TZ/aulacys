# catalog-svc

Retail SHB product catalog (8 in-scope SKUs). Feeds the frontend picker and
exposes `config_hint` (agents / gate / LTV / term) derived from seed features.

## Run

```bash
cd services/catalog-svc
pip install -r requirements.txt
uvicorn app.main:app --port 8350
pytest -q
```

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | `{status, product_count}` |
| `GET` | `/categories` | 5 categories |
| `GET` | `/products` | in-scope products only |
| `GET` | `/products/{id}` | product + `config_hint` |

## Env

| Var | Default |
|-----|---------|
| `CATALOG_SEED` | `seed/catalog.json` |
| `IN_SCOPE_ONLY` | `true` |

Graph still runs from `apps/api/src/agents/products/*.yaml` — catalog does not
replace product YAML; it maps picker SKUs → `graph_product` ids.
