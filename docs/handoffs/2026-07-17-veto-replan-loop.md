# Handoff — veto → replan loop, structured /assess endpoint, audit tables + service design

- **Date:** 2026-07-17
- **Author:** ttoannguyen (+ agent)
- **Branch / PR:** feat/agent-veto-loop → develop
- **Status:** 🔄 WIP — veto loop ✅ · `/assess` ✅ · audit tables ✅ created but ❌ not written to yet

## What changed & why
The veto → replan branch is the demo (`AGENTS.md` §0). It was decorative: on a veto
the graph incremented a counter and re-planned, but **never re-executed the agents**, so
the verdict could never change and the "cap" was cosmetic. Rebuilt it as a real bounded
loop — `plan → execute → (veto → replan → RE-EXECUTE)* up to REPLAN_CAP → escalate to
human` — matching `BUILD-GUIDE.md` §5.4. Also gated the Critic to lane 3 only (§8), and
added the immutable audit-chain tables the audit trail will persist into.

## Files touched
- `apps/api/src/agents/graph.py` — real veto loop (`while _has_veto and replan_count < CAP`), re-executes `_run_configured_agents` each iteration; `REPLAN_CAP 1→2`; lane from config (`_base_lane`, no `if product`); Critic runs only on lane 3; outcome/ticket/summary via `_decide_outcome`; stores `outcome` in state.
- `apps/api/src/agents/state.py` — add `outcome` key to `AgentState`.
- `apps/api/src/models/schemas.py` — `AssessResponse` (reuses `RunTrace`/`NodeTrace`/`ComplianceVerdict`).
- `apps/api/src/api/routes.py` — `POST /api/v1/assess` returns the structured run.
- `apps/web/lib/api.ts` — `AssessResponse` + `assess()` client (contract mirror).
- `apps/api/tests/test_agents/test_graph.py` — mortgage asserts `replan_count == 2`, `lane == 3`, 3 compliance traces; unsecured asserts `lane == 1` and `critic is None`.
- `apps/api/tests/test_api/test_routes.py` — `/assess` structured + empty-body tests.
- `apps/api/src/db/models/audit.py`, `apps/api/src/db/models/__init__.py` — `AuditRecord` + `AuditViolation` (SQLAlchemy 2.0).
- `apps/api/migrations/versions/0001_audit_chain.py` — tables + indexes + Postgres triggers forbidding UPDATE/DELETE (append-only).
- `apps/api/src/db/schema.sql` — readable DDL snapshot / psql bootstrap (Alembic stays source of truth).
- `apps/api/migrations/env.py` — import `src.db.models` so autogenerate sees tables.
- `docs/OVERVIEW.md` — one-screen system map + current state (read this first if lost).
- `docs/API.md` — endpoints + shapes for the frontend (`/chat`, `/assess`).
- `docs/ARCHITECTURE-services.md` — microservice decomposition, flow, events, per-service DB schema.

## How to run / verify
```bash
cd apps/api
python -m ruff check src/agents src/db tests    # All checks passed!
python -m pytest -q                             # 44 passed
python -m uvicorn src.main:app --port 8000      # then:
# curl -s localhost:8000/api/v1/chat -H "content-type: application/json" -d '{"message":"retail mortgage"}'
```
Expected mortgage response: `Compliance veto on prohibited_purpose_refinance_other_bank. Planner replanned 2 time(s), escalated to human after replan cap; Critic passed=True`.
Expected unsecured (`{"message":"unsecured"}`): `no blocking veto (ready_for_human_approval). Critic passed=n/a`.
Audit migration needs a real DB: set `DATABASE_URL` + `DIRECT_URL` in `.env`, then `python -m alembic upgrade head`. With no DB the app runs in-memory (demo-proof).

## Contract impact
**Changed** — `apps/api/src/models/schemas.py` adds `AssessResponse`; `apps/web/lib/api.ts` adds the matching `AssessResponse` interface + `assess()`. `ChatRequest`/`ChatResponse` unchanged, so `/chat` and the existing chat UI are untouched. Frontend can now render the full run via `POST /api/v1/assess`.

## Follow-ups / TODO
- [x] **Structured run endpoint** — `POST /api/v1/assess` returns `run_trace` + `trace[]` + `compliance`. ✅ done.
- [ ] **Frontend dashboard** — render `/assess` (lane badge, veto banner, replan counter, node timeline). `trace[]` shows the loop (`compliance` ×3).
- [ ] **`write_audit(state, session)`** — compute `content_hash`, chain `prev_hash`, INSERT record + violations at the terminal node. Tables exist; nothing writes to them.
- [ ] **`PolicyViolation.version`** — `loader.py` has `effective_from` but no `version`; `audit_violation.rule_version` needs it, and a veto without a version gets rejected by an inspector.
- [ ] **DAG drives execution** — `_run_configured_agents` still iterates the config `agents:` list; `state["plan"]` (the Planner's DAG) is not yet the thing that orders/parallelizes nodes.
- [ ] **Recoverable veto** — current veto is a hard prohibition that never clears, so the loop always runs to the cap. A soft/recoverable veto (e.g. missing doc → replan requests it → clears) would show replan *fixing* a case, not just escalating.

## Gotchas
- `REPLAN_CAP = 2` with a deterministic hard veto → Planner + agents run **3×** (initial + 2 replans). That is correct (bounded retry), not a loop bug. Trace has 3 `compliance` entries by design.
- Lane is derived from config `gate.stp_when == "never"` (mortgage) → lane 3. **No `if product ==` anywhere** (`BUILD-GUIDE.md` §11). Adding a product is a YAML file, not code.
- Windows: `make` is not installed — run the `python -m ruff` / `python -m pytest` commands directly. Port 8000 held by a stale uvicorn throws `WinError 10013`; free it with `Get-NetTCPConnection -LocalPort 8000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`.
- PowerShell `Invoke-RestMethod` mangles Vietnamese diacritics in the JSON body → 422. Send UTF-8 bytes or use the ASCII trigger `unsecured`.
