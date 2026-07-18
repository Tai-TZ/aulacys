# Handoff — backend product configs + policy caps + STP

- **Date:** 2026-07-18
- **Author:** agent
- **Branch / PR:** local (uncommitted)
- **Status:** ✅ Done

## What changed & why

Backend-only slice of `SERVICE-CODING-PLAN`: make the graph **config-driven per catalog SKU** without frontend work.

1. **8 product YAMLs** (`loan-1` … `loan-unsecured-overdraft`) + aliases `retail_mortgage` / `retail_unsecured_salary`. Each has `limits` (ltv_cap / amount_ceiling) and gate.
2. **Compliance** emits `ltv_within_product_cap` / `amount_within_product_ceiling` from product `limits` → policy YAML rules block (no `if product` in the graph).
3. **STP**: `_decide_outcome` returns `stp_approved` when `gate.stp_when` contains `all_rules_pass` and amount ≤ ceiling.
4. **Seeds**: property `DEMO-001` / `DEMO-OVER-LTV`; operations passes `parcel_id`; cic adds `Pham Thi Dti`.
5. **catalog-svc** `graph_product` now equals the YAML id (same string for assess).

## Files touched

- `apps/api/src/agents/products/*.yaml` — 8 SKUs + updated aliases
- `apps/api/src/agents/nodes/compliance.py` — product-limit metrics
- `apps/api/src/agents/nodes/operations.py` — parcel_id to valuation
- `apps/api/src/agents/graph.py` — STP from gate/limits
- `apps/api/src/agents/tools/property.py` — optional `parcel_id`
- `apps/api/src/policy/rules/retail_lending.yaml` (+ policy-svc mirror)
- `apps/api/src/models/schemas.py` — product field description
- `apps/api/tests/test_agents/test_products.py` — new
- `apps/api/tests/test_agents/test_graph.py` — unsecured → `stp_approved`
- `apps/api/tests/test_api/test_gateway.py` — status total 14 (catalog)
- `apps/api/tests/test_db/test_session.py` — force empty `DATABASE_URL` (`.env` pollution)
- `services/catalog-svc/seed/catalog.json` + tests
- `services/property-svc/seed/parcel.json`, `services/cic-svc/seed/cic_records.json`

## How to run / verify

```bash
cd apps/api
python -m ruff check src/ tests/
python -m pytest tests/ -q
# expect: 76 passed

# LTV veto via API
curl -s localhost:8000/api/v1/assess/application -H "content-type: application/json" -d "{\"product\":\"loan-1\",\"declared\":{\"customer_name\":\"X\",\"amount\":3800000000,\"term_months\":240,\"annual_rate\":0.1,\"monthly_income\":85000000,\"existing_monthly_debt\":0,\"declared_purpose\":\"mua nhà\",\"collateral_value_declared\":4000000000},\"documents\":[{\"kind\":\"cccd\",\"tier\":1,\"extracted\":{\"verified\":true}},{\"kind\":\"sao_ke_tai_khoan\",\"tier\":1,\"extracted\":{\"monthly_income\":85000000}},{\"kind\":\"so_do\",\"tier\":2,\"extracted\":{\"parcel\":\"DEMO-001\"}},{\"kind\":\"hop_dong_mua_ban\",\"tier\":2,\"extracted\":{}},{\"kind\":\"cic\",\"tier\":1,\"extracted\":{\"score_band\":\"A\"}},{\"kind\":\"purpose_evidence\",\"tier\":2,\"extracted\":{\"actual_purpose\":\"mua nhà để ở\"}}]}"
# outcome=vetoed, rule_ids includes max_ltv_product_cap
```

## Contract impact

`AssessApplicationRequest.product` description widened (same string field). No `api.ts` shape change required. Callers may now send catalog ids (`loan-1`, …).

## Follow-ups / TODO

- [ ] Frontend picker (deferred — backend focus)
- [ ] Postgres/Alembic for audit-svc / los-svc
- [ ] Layer remaining thin services (cic/aml/property/income/policy)
- [ ] Human-verify LTV/ceiling numbers → flip `verified: true`

## Gotchas

- Caps live in **product YAML `limits`**, not in the policy threshold for LTV — policy only sees the boolean metrics. Changing a product’s LTV = edit that YAML only.
- Unsecured demo message path now tickets as **`stp_approved`** (was HITL) when under ceiling.
- Local `.env` with `DATABASE_URL` used to break “disabled DB” tests; tests now force `DATABASE_URL=""`.
