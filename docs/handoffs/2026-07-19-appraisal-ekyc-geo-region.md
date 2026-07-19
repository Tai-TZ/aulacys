# Handoff — eKYC / geo / regional income appraisal gates

- **Date:** 2026-07-19
- **Author:** Cursor Auto
- **Branch / PR:** local working tree / PR not opened
- **Status:** ✅ Done

## What changed & why

Wired the three SOP thẩm định gates that were previously demo-skipped: eKYC Face Match ≥85%, geo radius ≤50 km to nearest CN/PGD, and regional minimum net income (HN/HCM vs other provinces). Compliance now calls deterministic tools, emits metrics, and policy YAML vetoes on failure (fail-closed when evidence is missing).

## Files touched

- `packages/shared/aulacys/agents/resources/compliance/ekyc_face_match.json` — 100 Face Match scores
- `packages/shared/aulacys/agents/resources/compliance/customer_geo.json` — customer lat/lon
- `packages/shared/aulacys/agents/resources/compliance/branches.json` — synthetic SHB branches
- `packages/shared/aulacys/agents/tools/{ekyc,geo,regional_income}.py` — tools
- `packages/shared/aulacys/agents/nodes/compliance.py` — dispatch + metrics
- `packages/shared/aulacys/policy/{metrics,profiles}.py` + `rules/retail_lending.yaml`
- `services/policy-svc/rules/retail_lending.yaml` — keep in sync
- `packages/shared/aulacys/agents/graph.py` — seed CCCDs aligned to datasets
- `eval/golden/compliance/*.json` — include new metrics
- `packages/shared/tests/test_agents/test_appraisal_criteria.py`
- `docs/DATASETS-COMPLIANCE.md`

## How to run / verify

```powershell
cd D:\aulacys
$env:PYTHONPATH='packages/shared'
.\apps\api\.venv\Scripts\python.exe -m pytest packages/shared/tests -q
```

Expected: all shared tests green (includes appraisal criteria + golden compliance 5/5).

## Contract impact

No frontend `schemas.py` / `api.ts` change. New Compliance metrics: `ekyc_face_match_ok`, `geo_within_radius`, `income_meets_regional_min`. New tool results on `compliance.tool_results`.

## Follow-ups / TODO

- [ ] Age-at-maturity rule (22–60 at maturity) still not wired
- [ ] DTI band caps by income segment (35/45/50–55%) still generic 0.5
- [ ] Disposable income buffer tool still open

## Gotchas

- Missing eKYC/geo record ⇒ score/radius fail-closed (blocking), same as missing required metrics.
- CCCD for these tools prefers `national_id` then `id_number`. Demo seeds now set both.
- Regional floors are midpoints: HN/HCM **7.5tr**, other provinces **4.75tr** (`regional_income.py`).
- Face-match fail fixtures: CCCDs ending in the seeded fail set (e.g. `001099000010`).
