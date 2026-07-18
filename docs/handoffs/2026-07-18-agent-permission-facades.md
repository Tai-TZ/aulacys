# Handoff - Agent permission facades

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `codex/fix-dag-execution-order` -> `develop`
- **Status:** Done

## What Changed & Why
Refactored agent tool boundaries to match the 5-role contract in `docs/AGENT-SPEC.md`: agent specs now expose logical permission facades instead of raw physical tool names. The harness expands those facades at dispatch time, so audit trace still records concrete tool evidence like `compute_dti`, `kyc_check`, or `write_approval_ticket`.

## Files Touched
- `apps/api/src/agents/harness/permissions.py` - new facade map: `core_banking_read`, `loan_calculator`, `aml_screening`, `workflow_write`.
- `apps/api/src/agents/harness/dispatch.py`, `apps/api/src/agents/harness/runner.py` - enforce/trace permissions through facade expansion.
- `apps/api/src/agents/nodes/credit.py` - Credit declares `core_banking_read` + `loan_calculator`; income tool selection no longer inspects physical whitelist entries.
- `apps/api/src/agents/nodes/compliance.py` - Compliance declares `core_banking_read` + `aml_screening`.
- `apps/api/src/agents/nodes/operations.py` - Operations declares `core_banking_read` + `workflow_write`.
- `apps/api/src/agents/products/retail_mortgage.yaml`, `apps/api/src/agents/products/retail_unsecured_salary.yaml` - canonical product YAMLs now list facade permissions.
- `apps/api/tests/test_agents/test_permissions.py`, `apps/api/tests/test_agents/test_graph.py` - added contract and denial tests for facade boundaries.
- `docs/AGENT-SPEC.md` - updated current-state table and documented facade -> physical tool mapping.

## How To Run / Verify
```bash
cd apps/api
python -m ruff check src tests
python -m ruff format --check src tests
python -m pytest tests -q
```

Expected result: Ruff passes and pytest reports `93 passed` with one existing FastAPI/TestClient deprecation warning.

## Contract Impact
None. `apps/api/src/models/schemas.py` and `apps/web/lib/api.ts` were not changed in this slice.

## Follow-Ups / TODO
- [ ] Decide whether to rename `core_banking_read` into smaller production facades later (`customer_read`, `collateral_read`) once real service ownership is clearer.
- [ ] Add real KB/RAG namespaces for Credit/Compliance/Ops; this slice only fixes tool permission boundaries.

## Gotchas
`spec.tools` now contains permission facade names, not physical tool names. Any node code that needs to check whether a physical tool is available must use `is_tool_allowed(spec.tools, "tool_name")`; do not use `"tool_name" in spec.tools`.
