# Handoff - Agent completion and LLM tiers

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `codex/fix-dag-execution-order` -> `develop`
- **Status:** Done

## What Changed & Why
Completed the core agent slice against `docs/AGENT-SPEC.md`: agents now have explicit model tiers, deterministic pricing/KYC/UBO/valuation actions, and Critic emits an evidence memo plus remediation plan. The LLM path is prose-only for Planner/Critic and merges only allowed prose fields over deterministic base output, so DAG structure, numbers, policy and veto remain tool/config driven.

## Files Touched
- `apps/api/src/agents/specs/base.py` - added `model_tier` and `prose_fields`.
- `apps/api/src/config.py`, `apps/api/src/services/llm.py`, `apps/api/.env.example`, `apps/api/README.md` - added `STRONG_MODEL`/`MINI_MODEL` tier config while keeping `MODEL_NAME` fallback.
- `apps/api/src/agents/harness/runner.py` - routes LLM calls by tier and limits prose LLM output to whitelisted fields.
- `apps/api/src/agents/tools/pricing.py`, `apps/api/src/agents/tools/kyc.py`, `apps/api/src/agents/tools/property.py`, `apps/api/src/agents/tools/__init__.py` - added `price_loan`, `kyc_check`, `ubo_check`, and `schedule_valuation` tools.
- `apps/api/src/agents/nodes/*.py` - Planner rationale, Credit pricing/limit, Compliance KYC/UBO with dispatcher-enforced LTV, Operations valuation scheduling, Critic memo/remediation.
- `apps/api/src/agents/products/retail_mortgage.yaml`, `apps/api/src/agents/products/retail_unsecured_salary.yaml` - added pricing config and tool lists for the two canonical demo products.
- `apps/api/src/policy/rules/retail_lending.yaml` - added KYC/UBO blocking controls as policy-as-code.
- `apps/api/src/agents/state.py`, `apps/api/src/models/schemas.py`, `apps/api/src/api/routes.py`, `apps/web/lib/api.ts` - exposed new assessment fields and `critic` in the API contract.
- `apps/api/tests/*` - tests now force `OPENAI_API_KEY=""` and assert pricing, KYC/UBO, valuation scheduling, and Critic memo behavior.

## How To Run / Verify
```bash
cd apps/api
python -m ruff check src tests
python -m ruff format --check src tests
python -m pytest tests -q

cd ../web
npm run lint
npm run build
```

Expected result: backend Ruff checks pass, backend tests report `89 passed` with one existing FastAPI/TestClient deprecation warning, frontend lint/build pass with existing `<img>` warnings in `components/admin/assess-dashboard.tsx`.

## Contract Impact
Changed `apps/api/src/models/schemas.py` and mirrored in `apps/web/lib/api.ts`.

`AssessResponse` now includes optional `critic`. `CreditAssessment` includes `proposed_limit`, `proposed_rate`, and `rationale`. `OperationsReport` includes `valuation_task`. `ComplianceVerdict` includes `kyc_status` and `ubo_status`.

## Follow-Ups / TODO
- [ ] Decide whether to sync pricing/KYC tool lists into the additional `loan-*` catalog YAMLs; this change only updates the two canonical demo products from `AGENTS.md`.
- [ ] Replace mock KYC/UBO policy references with real SHB/legal references before production claims.
- [ ] If prose LLM should be enabled in CI-like environments, mock `get_llm()` instead of relying only on `OPENAI_API_KEY=""`.

## Gotchas
Do not set `llm_prose=True` on Credit, Compliance, or Operations unless the runner is extended to merge only non-critical prose fields for them. The current design intentionally lets Planner/Critic use strong-model prose while keeping all numbers, policy decisions and veto edges deterministic.
