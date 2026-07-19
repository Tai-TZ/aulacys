# Handoff — Credit proposal reasonableness

- **Date:** 2026-07-19
- **Author:** Cursor agent
- **Branch / PR:** `feat/credit-proposal-reasonableness` → develop
- **Status:** ✅ Done

## What changed & why
Credit now explicitly validates whether the **proposed loan plan** is financially reasonable, not only whether the customer looks repayable. Numbers still come only from whitelisted tools (`cic_lookup`, income/salary verify, debt service, DTI, `price_loan`); Credit interprets those results against product `limits` / `pricing` and records structured findings under `tool_results.proposal_reasonableness`. Also fixed CCCD resolution so demo seeds that set `national_id` (not `id_number`) no longer hit the default overdue CIC stub. Review follow-up: disabled LLM prose on Credit, fixed CIC consent override, stopped coercing `cic_group` 0→1, fail-closed missing max_dti/rate/term config, stricter `limit_reduced` → `manual_review`, and cite `compute_dti` only when called.

## Files touched
- `packages/shared/aulacys/agents/nodes/credit.py` — helpers for income/CCCD/consent, deterministic reasonableness checks, recommendation from checks, rationale, `llm_prose` for rationale only, reads `metadata` for product config.
- `packages/shared/tests/test_agents/test_credit_metrics.py` — support path, national_id CIC, DTI/term failures, salary_verify evidence, role lock.
- `packages/shared/tests/test_agents/test_runner.py` — P0-2 guard now uses Compliance as the non-prose example; Credit locked to rationale-only prose.

## How to run / verify
```bash
cd packages/shared
python -m ruff check aulacys tests
python -m ruff format --check aulacys tests
python -m pytest tests/ -q
```

Expected result: Ruff clean; pytest reports `94 passed`.

## Contract impact
None. Public `CreditAssessment` shape unchanged. Internal `tool_results` gained `proposal_reasonableness` and keeps an `income_verify` alias when `salary_verify` ran so Compliance metrics stay stable.

## Follow-ups / TODO
- [ ] Encode DTI income-band caps from `docs/FLOW-BUSINESS-CONFIRMED.md` into product/policy YAML (Credit currently uses product `pricing.max_dti`).
- [ ] If UI should show reasonableness findings, map `tool_results.proposal_reasonableness` in the assess dashboard deliberately.
- [ ] Persist Credit tool evidence into durable audit when agent-run persistence is turned on.

## Gotchas
Credit keeps `llm_prose=False` so rationale numbers cannot be rewritten by an LLM. `cic_consent` is required; `consent_data_processing=True` cannot override a CIC denial. Consent-denied / missing `cic_group` is passed to `price_loan` as group `5` (fail closed — never coerce to group 1). Missing `pricing.max_dti`, rate band, or term limit → fail closed. `amount_ceiling` remains optional (secured products often omit it). CIC group cap is only applied when product config sets `max_cic_group`; statutory appetite stays in Compliance policy. Recommendation vocabulary stays `support | review | manual_review` — Credit still does **not** approve or veto. CCCD lookup order is `national_id` → CCCD document extract → `id_number`.
