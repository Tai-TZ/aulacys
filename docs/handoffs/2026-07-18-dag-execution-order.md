# Handoff — DAG Execution Order

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** develop local working tree
- **Status:** ✅ Done

## What changed & why
The agent graph now executes configured agents in dependency order instead of blindly following the YAML `agents` list. It combines Planner DAG edges with each `AgentSpec.reads` dependency, so Compliance cannot run before the Credit/Operations outputs it reads even if product config order is accidentally changed. A DB ping test was also made environment-isolated so a real local `DATABASE_URL` no longer makes the disabled-DB fallback test flaky.
The cleanup pass also moved approval-ticket writes behind the Operations agent whitelist and surfaces DAG dependency cycles in `metadata.graph_warnings` instead of silently continuing.

## Files touched
- `apps/api/src/agents/graph.py` — added configured-agent filtering and topological execution from plan edges + spec read-sets.
- `apps/api/src/agents/nodes/operations.py` — made Operations own `write_approval_ticket` via the shared dispatch whitelist.
- `apps/api/tests/test_agents/test_graph.py` — added a regression test that reverses mortgage agent order and asserts Compliance still runs after Credit and Operations.
- `apps/api/tests/test_db/test_session.py` — clears `DATABASE_URL` inside the disabled ping test before asserting fallback behavior.

## How to run / verify
```bash
cd apps/api
python -m ruff check src tests
python -m ruff format --check src tests
python -m pytest tests -q
```
Expected result: ruff passes; pytest reports `87 passed` with one existing FastAPI/TestClient deprecation warning.
Latest cleanup result: `88 passed` with the same existing warning.

## Contract impact
None. `apps/api/src/models/schemas.py` and `apps/web/lib/api.ts` were not changed.

## Follow-ups / TODO
- [ ] Consider promoting `metadata.graph_warnings` into a visible dashboard/audit event.
- [ ] Frontend build was not rerun because this change is backend-only.

## Gotchas
The executor intentionally treats `AgentSpec.reads` as runtime dependencies when the read key is another configured agent name. That keeps the graph safe when YAML order drifts, but product `depends:` should still be the visible business DAG used in demos. DAG cycles stay demo-proof: they warn and continue in remaining configured order rather than raising.
