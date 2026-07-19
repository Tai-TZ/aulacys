# Handoff — Remaining SOP appraisal criteria

- **Date:** 2026-07-19
- **Author:** Cursor Auto
- **Branch / PR:** local working tree / PR not opened
- **Status:** ✅ Done

## What changed & why

Closed the last SOP §3.A–3.C gaps for **unsecured** thẩm định: age at maturity (22–60), amount ≤12× income, purpose↔tenor bands, DTI by income band (35/45/55%), and disposable living-cost buffer (~3.5tr). Credit measures via tools; Compliance judges via policy flags. Secured/mortgage keeps LTV/land rules and does **not** require the unsecured-only income-multiple / purpose-tenor / DTI-band / disposable rules.

## Files touched

- `packages/shared/aulacys/agents/tools/appraisal.py` — new deterministic tools
- `packages/shared/aulacys/agents/nodes/credit.py` — call tools + tighten recommendation
- `packages/shared/aulacys/agents/nodes/compliance.py` — emit metrics from Credit results
- `packages/shared/aulacys/policy/{metrics,profiles}.py` + `rules/retail_lending.yaml`
- `services/policy-svc/rules/retail_lending.yaml`
- `eval/golden/compliance/*.json` — new metrics
- `packages/shared/tests/...` + HITL seed amount adjusted to ≤12× income

## How to run / verify

```powershell
cd D:\aulacys
$env:PYTHONPATH='packages/shared'
.\apps\api\.venv\Scripts\python.exe -m pytest packages/shared/tests -q
```

Expected: **104 passed**.

## Contract impact

none (agent/policy internal)

## Follow-ups / TODO

- [ ] Real face-match CV provider (avatar path equality is still demo)
- [ ] Secured-specific DTI/LTV disposable rules if product team wants mortgage parity

## Gotchas

- Purpose “tiêu dùng” alone ⇒ small band (12–24m). Need keywords like `nội thất` / `sửa nhà` for 36–60m.
- Absolute DTI warning ceiling is now **0.55**; band rule is the blocking gate for unsecured.
- Missing DOB ⇒ `age_at_maturity_ok=0` fail-closed.
