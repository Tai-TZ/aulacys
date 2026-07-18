# Handoff - Planner DAG hardening

- **Date:** 2026-07-19
- **Author:** Codex
- **Branch / PR:** `codex/planner-dag-hardening` -> PR #40
- **Status:** Done

## What changed & why
Planner now builds a more honest deterministic DAG for the configured product instead of returning only raw YAML dependencies. It keeps Planner inside its role: read config/state, route agents, explain plan/replan, and never compute figures, approve, veto, or call tools. The graph now provides each agent's read contract to Planner so visible DAG edges match actual data dependencies like `credit -> compliance`. The DAG also carries `plan_id`, `plan_hash`, and warning fields so the structural plan can be traced/replayed more like production.

## Files touched
- `packages/shared/aulacys/agents/nodes/planner.py` - added pure helpers for configured-agent filtering, config dependency validation, input dependency edges, deduping, shared topological ordering, clearer rationale/replan rationale, stable plan hashing, and internal plan trace records.
- `packages/shared/aulacys/agents/graph.py` - injects configured agent read contracts into metadata before Planner runs; consumes the shared Planner topo-sort helper instead of recalculating ordering from `spec.reads`.
- `packages/shared/aulacys/agents/state.py` - extends `DAG` with `plan_id`, `plan_hash`, and `warnings`.
- `packages/shared/tests/test_agents/test_planner.py` - covers parallel roots, data edges, replan rationale with veto rule IDs, warnings for invalid product config references, stable hash/id, and cycle warnings before graph execution.
- `packages/shared/tests/test_agents/test_graph.py` - locks graph ordering to Planner DAG only, so there is one source of truth for runtime order.

## How to run / verify
```bash
cd packages/shared
python -m ruff check aulacys tests
python -m ruff format --check aulacys tests
python -m pytest tests/ -q
```

Expected result: Ruff check passes, format check passes, and pytest reports `94 passed`.

## Contract impact
No public API response change. Internal shared `DAG` gained optional/defaulted audit fields: `plan_id`, `plan_hash`, `warnings`.

## Follow-ups / TODO
- [ ] If the team wants Planner visible in the UI, expose `plan`/`planner_warnings` deliberately through the API contract in a separate PR.
- [ ] If new agents are added later, make sure their `reads` contract stays accurate because Planner uses it to derive data dependencies.
- [ ] Persist `metadata.planner_plan_trace` to a durable audit store when the team turns on production persistence for agent runs.

## Gotchas
Planner warnings are internal metadata today; they are not shown in `AssessResponse`. `plan_hash` intentionally hashes the structural plan only (`product`, `nodes`, `edges`), not `replan_count` or LLM-polished prose, so the same DAG keeps the same replay/audit identity across replans. LLM prose can still refine only `DAG.rationale` when an LLM key is configured, but nodes/edges/hash remain deterministic because runner seeds the authoritative fallback object and copies back only prose fields.
Graph intentionally trusts Planner DAG edges for ordering now. If a future change removes reads-derived edges from Planner, graph will not quietly add them back.
