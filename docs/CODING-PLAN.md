# Coding plan — what to build next, how

> Task list for the team, priority-ordered, with files + steps + done-criteria.
> Read `OVERVIEW.md` (map) and `SYSTEM-ARCHITECTURE.md` (services) first.
> Rule of the repo: `AGENTS.md` §0 (retail scope), §2 (handoff after each slice).

## Baseline — every task

```bash
# backend (from apps/api)
python -m ruff check src tests && python -m ruff format src tests && python -m pytest -q   # must be green
# frontend (from apps/web)
npm run build
```
- Don't commit red. Add a test for what you change.
- Change the API contract → update `apps/api/src/models/schemas.py` **and** `apps/web/lib/api.ts`.
- Finish a slice → write `docs/handoffs/YYYY-MM-DD-<slug>.md` (`/handoff` skill).

---

## P0 — do first (demo-critical, low risk)

### P0.1 — Real loan input (stop being seed-only)
**Why:** today `/assess` takes `{message}` and `seed_application()` picks a hardcoded
file. A judge asking "where do I enter an application?" exposes the seed.
**Files:** `apps/api/src/models/schemas.py`, `apps/api/src/api/routes.py`,
`apps/api/src/agents/graph.py` (`process_application` already accepts a state with
`application`), `apps/web/lib/api.ts`, a form in `apps/web`.
**Steps:**
1. Add `AssessApplicationRequest` mirroring `state.py::LoanApplication` (`DeclaredForm` + `list[Document]`).
2. New route `POST /api/v1/assess/application` that seeds `state["application"]` from the body (not from `seed_application`).
3. Keep `/assess` (message → seed) for the quick demo.
4. Frontend: a simple form (declared fields + document tier selectors) → `assessApplication()`.
**Done:** post a full application JSON → same veto flow runs on the submitted data; `make check` green; contract mirrored.
**Note:** no OCR (`AGENTS.md` §0). Tier-3 documents carry `extracted` + `confirmed_by` — a human confirm checkbox, not OCR.

### P0.2 — Dashboard renders `/assess`
**Why:** "Monitor is the product" (`BUILD-GUIDE.md` §8.1). The `trace[]` already shows the veto loop.
**Files:** `apps/web/app/*`, `apps/web/components/ui/*`, uses `assess()` in `lib/api.ts`.
**Steps:** lane badge (`run_trace.lane`), veto banner (`compliance.veto` + `rule_ids`), replan counter, **node timeline** from `trace[]` (the repeated `compliance` entries = the money shot), ticket + audit seq/hash.
**Done:** submit → dashboard shows lane, veto, replan count, per-node timeline; `npm run build` green.

### P0.3 — Fix stale scenario doc
**Why:** `docs/00-START-HERE.md` still shows the dead corporate 20bn scenario — contradicts `AGENTS.md` §0 and confuses everyone.
**Steps:** replace the "kịch bản đã chốt" block with the retail scenario (veto = prohibited purpose, not credit-limit). One edit.
**Done:** `00-START-HERE.md` agrees with `AGENTS.md` §0 and the code.

---

## P1 — makes it real (medium)

### P1.1 — Verify policy thresholds (§12 blockers) — PITCH BLOCKER
**Why:** rules with `verified: false` are placeholders (`single_customer_credit_limit` 0.15 is the pre-2024 figure). A wrong statutory number in front of SHB judges kills the pitch.
**Files:** `apps/api/src/policy/rules/*.yaml` (+ the copies in `services/policy-svc/rules/`).
**Steps:** a human opens the current law, sets real thresholds, flips `verified: true`, records the source. Do NOT ask an LLM for the number.
**Done:** no `verified: false` on any rule shown on stage, or it is badged "unverified" in the UI.

### P1.2 — Add `PolicyViolation.version`
**Why:** the audit ledger needs a real rule version; today `audit_client.py` uses `ef:<effective_from>` as a stand-in. An inspector rejects a veto without a version.
**Files:** `apps/api/src/policy/loader.py` (add `version` to `PolicyRule` + `PolicyViolation`), rule YAMLs (add `version:`), `apps/api/src/agents/audit_client.py` (use `v.version`), same in `services/policy-svc`.
**Done:** audit records carry a real `rule_version`; tests updated.

### P1.3 — Wire the real LLM (agents currently deterministic)
**Why:** `runner.py` uses `spec.fallback` (deterministic); `services/llm.py` has `ChatOpenAI` but nothing calls it. The flow has no LLM yet.
**Files:** `apps/api/src/agents/harness/runner.py`, `apps/api/src/services/llm.py`, `apps/api/src/config.py` (`model_name`, `openai_api_key`).
**Steps:** in `runner.run`, if a model is configured, call the LLM (assemble→call→parse→retry), keep `spec.fallback` as the fallback on error/timeout (`AGENTS.md` §6). Enforce `spec.max_tool_calls`. Route tools through `dispatch`.
**Done:** with a key set, agents call the model; with it unset, deterministic fallback still passes all tests. Model choice is a team decision (`AGENTS.md` §3 / §12 — `gpt-4o-mini` is weak for the Planner).

### P1.4 — RAG for regulatory text
**Why:** in scope (`AGENTS.md` §0 "retrieve regulatory knowledge via RAG"). Job is narrow: retrieve the **text** of a legal article for a citation — NOT thresholds (those stay in policy YAML, `BUILD-GUIDE.md` §5.2).
**Files:** new `services/rag-svc` (or `apps/api/src/rag/`), `config.py` (`chroma_persist_dir` exists), Compliance/Critic use it via `spec.kb`.
**Blocked by:** P1.1 — index real article text only after the rule_ids are verified, else you index wrong law.
**Done:** a citation can link to retrieved article text; unverified content is badged.

---

## P2 — architecture depth (do after the demo is locked)

### P2.1 — DAG drives execution
**Why:** `_run_configured_agents` iterates the config `agents:` list; the Planner's `state["plan"]` (DAG) is decorative. Make the DAG order/parallelize nodes so the Planner has a runtime reason to exist.
**Files:** `apps/api/src/agents/graph.py`.

### P2.2 — Microservice Phase 5–6 (⚠️ high risk)
**Why:** finish the split — agent workers (`credit/operations/compliance/critic`) become services (ports 8401–8404, already stubbed in `services/api-gateway` SERVICES list); orchestrator calls them over HTTP.
**Risk:** puts the **veto→replan loop across the network** — slower + more failure points. `AGENTS.md`:43 / hour-36: do NOT start before the demo is otherwise locked. Keep in-process workers as fallback.
**Files:** new `services/credit-svc` … per `ARCHITECTURE-services.md` §9; orchestrator swaps `run(spec, state)` for HTTP with request_id propagation.

---

## Quick reference — where things live

| Thing | Path |
| ----- | ---- |
| Orchestrator + veto loop | `apps/api/src/agents/graph.py` |
| Agents | `apps/api/src/agents/nodes/*` |
| Harness (LLM slot, whitelist, trace) | `apps/api/src/agents/harness/*` |
| Tools (13) | `apps/api/src/agents/tools/*` |
| Policy engine | `apps/api/src/policy/loader.py` + `rules/*.yaml` |
| Service seams (HTTP + fallback) | `policy/client.py`, `agents/audit_client.py`, `tools/{cic,aml,property,income,workflow}.py` |
| API contract | `apps/api/src/models/schemas.py` ↔ `apps/web/lib/api.ts` |
| Microservices | `services/*` (run: `docs/MICROSERVICES-STATUS.md`) |
| Data design | `state.py` + `ARCHITECTURE-services.md` §12–13 |
