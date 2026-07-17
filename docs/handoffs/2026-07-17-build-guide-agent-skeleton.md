# Handoff — build guide agent skeleton

- **Date:** 2026-07-17
- **Author:** Codex
- **Branch / PR:** local working tree
- **Status:** ✅ Done

## What changed & why

Implemented the first demo-proof backend slice from `docs/BUILD-GUIDE.md`: a config-driven retail lending graph with deterministic agent fallbacks, policy-based Compliance veto, Planner replan cap, Critic audit, and a mock workflow ticket write. This intentionally avoids live LLM/network calls for now so the wow path is stable offline while preserving the harness shape where real LLM calls can be plugged in later.

## Files touched

- `apps/api/src/agents/graph.py` — replaced placeholder graph with a LangGraph orchestrator that loads product YAML, runs configured agents, handles veto/replan, runs Critic, and writes a mock ticket.
- `apps/api/src/agents/state.py` — added internal Pydantic schemas for application, documents, agent outputs, DAG, trace, and run trace.
- `apps/api/src/agents/harness/*` — added shared context slicing, whitelist dispatch, runner, meter timer, and trace emit helpers.
- `apps/api/src/agents/specs/*` — added `AgentSpec`.
- `apps/api/src/agents/nodes/*` — added Planner, Credit, Operations, Compliance, and Critic deterministic node implementations/specs.
- `apps/api/src/agents/tools/*` — added retail tool stubs for CIC, income, property, AML, workflow ticketing, and registered them.
- `apps/api/src/agents/nodes/example_node.py`, `apps/api/src/agents/tools/example_tool.py` — removed old placeholders no longer used by the graph.
- `apps/api/src/agents/tools/loan_calculator.py` — added `compute_dti` for retail credit.
- `apps/api/src/agents/products/*` — added `retail_unsecured_salary.yaml` and `retail_mortgage.yaml`.
- `apps/api/src/policy/loader.py` — added `as_of` effective-date filtering and `effective_to` support.
- `apps/api/src/policy/rules/retail_lending.yaml` — added retail DTI warning and prohibited-purpose blocking demo rule.
- `apps/api/tests/test_agents/*`, `apps/api/tests/test_policy/test_loader.py` — added tests for veto/replan/ticket, unsecured config path, DTI, and policy effective dates.

## How to run / verify

```bash
cd apps/api
python -m ruff check src tests
python -m ruff format --check src tests
pytest tests/ -q
```

Expected result: ruff passes, format check passes, and pytest reports `44 passed`.

`make check` was attempted first, but this Windows shell does not have `make` installed. The equivalent lint/format/test commands above all passed.

## Contract impact

None. `apps/api/src/models/schemas.py` and `apps/web/lib/api.ts` were not changed; `/api/v1/chat` still returns `{ response }`.

## Follow-ups / TODO

- [ ] Replace deterministic fallback internals with real LLM calls behind `harness.runner` once the demo path remains green.
- [ ] Verify the exact legal basis for `prohibited_purpose_refinance_other_bank` before quoting it externally.
- [ ] Decide whether the seeded demo application should move from `graph.py` into fixture/config data.
- [ ] Surface `trace`, `run_trace`, `ticket`, and veto details in the frontend dashboard.

## Gotchas

`TEAM_RULES.md` still contains an older decision row about the corporate 20bn scenario, but `AGENTS.md` §0 and `BUILD-GUIDE.md` now make retail/individual the binding scope. The graph follows the newer retail scope. Product behavior is driven by YAML configs; avoid adding product-specific branches to the graph when adding more products.
