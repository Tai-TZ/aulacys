# Handoff — CIC Credit History fields (VN)

- **Date:** 2026-07-19
- **Author:** Cursor Auto
- **Branch / PR:** local working tree / PR not opened
- **Status:** ✅ Done

## What changed & why

Enriched the synthetic CIC dataset to match the Credit History dictionary: `customer_id`, `debt_group`, `outstanding_debt`, `overdue_history`, and `number_of_institutions`. Records now use Vietnamese customer names (linked to KYC when CCCD matches) and Vietnamese credit-type labels, while keeping legacy fields (`cic_group`, `total_outstanding_vnd`, `max_overdue_days`) for existing credit/compliance consumers.

## Files touched

- `services/cic-svc/seed/cic_records.json` — schema 2.0 / version 2026.2, 100 records with Credit History fields
- `services/cic-svc/scripts/enrich_cic_credit_history.py` — one-shot enricher (re-runnable from KYC + existing CIC)
- `services/cic-svc/app/schemas/cic.py` — `OverdueHistory` + new LookupResponse fields
- `services/cic-svc/app/services/cic.py` — expose seeded Credit History on `/lookup`
- `services/cic-svc/tests/test_lookup.py` — assert new fields + VN identity
- `packages/shared/aulacys/agents/tools/cic.py` — fallback shape aligned to 2026.2
- `packages/shared/tests/test_agents/test_cic_tool.py` — fallback coverage
- `docs/DATASETS-COMPLIANCE.md`, `services/cic-svc/README.md` — document fields

## How to run / verify

```powershell
cd D:\aulacys\services\cic-svc
..\..\apps\api\.venv\Scripts\python.exe -m pytest tests -q

cd D:\aulacys
$env:PYTHONPATH='packages/shared'
.\apps\api\.venv\Scripts\python.exe -m pytest packages/shared/tests/test_agents/test_cic_tool.py -q
```

Expected: cic-svc `11 passed`; shared cic tool `3 passed`.

Sample lookup: CCCD `001099000001` → `customer_id=CUST-000001`, `debt_group=1`, `full_name=NGUYỄN VĂN AN`.

## Contract impact

No frontend `schemas.py` / `api.ts` change. cic-svc response gained Credit History fields; `cic_group` remains an alias of `debt_group`. Agent tool consumes the dict as before.

## Follow-ups / TODO

- [ ] Align the remaining 7 CIC-only CCCDs (`001099000094`–`100`) with the 7 KYC-only CCCDs if full KYC↔CIC key parity is required
- [ ] Optionally look up by `customer_id` in addition to CCCD

## Gotchas

`debt_group` is stored in the seed and returned preferentially; scorecard still derives group from `max_overdue_days` as a fallback. Keep `overdue_history.max_days` in sync with `max_overdue_days` or scorecard/group can disagree. Re-running `scripts/enrich_cic_credit_history.py` overwrites Vietnamese enrichment from the current KYC file.
