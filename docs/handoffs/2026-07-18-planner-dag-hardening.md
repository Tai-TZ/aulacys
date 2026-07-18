# Handoff - Planner DAG hardening

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `codex/feat-loan-proposal` local changes, not pushed yet
- **Status:** Done

## What changed & why
Planner now builds a more honest deterministic DAG for the configured product instead of returning only raw YAML dependencies. It keeps Planner inside its role: read config/state, route agents, explain plan/replan, and never compute figures, approve, veto, or call tools. The graph now provides each agent's read contract to Planner so visible DAG edges match actual data dependencies like `credit -> compliance`.

## Files touched
- `packages/shared/aulacys/agents/nodes/planner.py` - added pure helpers for configured-agent filtering, config dependency validation, input dependency edges, deduping, and clearer rationale/replan rationale.
- `packages/shared/aulacys/agents/graph.py` - injects configured agent read contracts into metadata before Planner runs.
- `packages/shared/tests/test_agents/test_planner.py` - covers parallel roots, data edges, replan rationale with veto rule IDs, and warnings for invalid product config references.

## How to run / verify
```bash
cd packages/shared
python -m ruff check aulacys tests
python -m ruff format --check aulacys tests
python -m pytest tests/ -q
```

Expected result: Ruff check passes, format check passes, and pytest reports `93 passed`.

## Contract impact
None. No API schema or frontend type changed.

## Follow-ups / TODO
- [ ] If the team wants Planner visible in the UI, expose `plan`/`planner_warnings` deliberately through the API contract in a separate PR.
- [ ] If new agents are added later, make sure their `reads` contract stays accurate because Planner uses it to derive data dependencies.

## Gotchas
Planner warnings are internal metadata today; they are not shown in `AssessResponse`. LLM prose can still refine only `DAG.rationale` when an LLM key is configured, but nodes/edges remain deterministic because runner seeds the authoritative fallback object and copies back only prose fields.
