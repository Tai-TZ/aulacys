# Handoff - Extensible compliance controls

- **Date:** 2026-07-19
- **Author:** Codex
- **Branch / PR:** `feat/catalog-crud-dossier-db` / PR not opened
- **Status:** Done

## What changed & why

Compliance now consumes typed KYC, AML, and related-party facts instead of assuming a clean customer. STP is fail-safe: Credit must recommend `support`, Compliance must have zero findings, and the metric report must be complete. AML exposes `checked`, `invalid`, or `unavailable`; incomplete screening routes to HITL. Every policy rule, including passed rules, now has a structured evidence row.

The internal standard `2026.1`, golden cases, and evaluator remain the decision oracle. The unsecured-term product declares its policy profile and reusable rule-set names in config so new packages do not require product branches.

## Files touched

- `packages/shared/aulacys/agents/graph.py` - harden STP eligibility.
- `packages/shared/aulacys/agents/nodes/compliance.py` - validate facts, tool status, document usability, metrics, and rule evidence.
- `packages/shared/aulacys/agents/state.py` - add document provenance and `PolicyDecisionEvidence` contract.
- `packages/shared/aulacys/agents/tools/aml.py` - explicit checked/invalid/unavailable results and seeded evidence metadata.
- `packages/shared/aulacys/agents/products/loan-unsecured-term.yaml` - explicit unsecured policy configuration.
- `packages/shared/aulacys/policy/*` and `services/policy-svc/rules/retail_lending.yaml` - common AML completeness gate and evidence-aware metrics.
- `apps/web/lib/api.ts` - mirror the backend provenance and rule-evidence contract.
- `packages/shared/tests/*`, `services/*/tests/*`, and `eval/*` - regression and golden coverage.
- `docs/policy/standards/AULACYS-COMPLIANCE-STANDARD-2026.md` - internal reference standard.

## How to run / verify

```powershell
cd D:\aulacys
$env:PYTHONPATH='packages/shared'
.\apps\api\.venv\Scripts\python.exe -m pytest packages/shared/tests -q

cd services\orchestrator-svc
$env:PYTHONPATH='../../packages/shared;.'
..\..\apps\api\.venv\Scripts\python.exe -m pytest tests -q

cd ..\policy-svc
..\..\apps\api\.venv\Scripts\python.exe -m pytest tests -q

cd ..\aml-svc
..\..\apps\api\.venv\Scripts\python.exe -m pytest tests -q

cd ..\..\apps\web
npm.cmd run lint
npm.cmd run build
```

Expected: shared `93 passed`, orchestrator `34 passed`, policy `6 passed`, AML `2 passed`; frontend lint and production build succeed.

```powershell
cd D:\aulacys
$env:PYTHONPATH='packages/shared'
.\apps\api\.venv\Scripts\python.exe eval\run_compliance_eval.py
```

Expected: `5/5`, `accuracy: 1.0`. This is synthetic scoped accuracy, not production accuracy.

## Contract impact

Changed and mirrored. `Document`/`DocumentInput` gained optional `source`, `evidence_id`, `dataset_version`, and `verified_at`. `ComplianceVerdict` gained `rule_evidence[]` containing status, metric, actual/threshold, source, evidence ID, dataset version, standard reference, and policy version. `apps/web/lib/api.ts` was updated in the same change.

## Follow-ups / TODO

- [ ] Connect production KYC/AML/CIC/income providers; seeded fallbacks remain labelled demo data.
- [ ] Replace remaining MOCK legal bases before production use.

## Gotchas

Do not add `if product == ...` branches. Tool failure is not a clean result: keep the completeness warning even when zero placeholders are supplied to numeric rules. Run each microservice test suite from its own directory because their top-level Python packages are all named `app`.
