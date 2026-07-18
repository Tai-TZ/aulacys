# Production Readiness Assessment

> End-to-end audit of the SHB Digital Expert Agents system — data, agent graph, node
> processing, LLM usage, and knowledge base — scored against a **production banking deploy**
> bar (not the hackathon demo bar). Companion to [`SECURITY.md`](./SECURITY.md), which is the
> auth/RBAC roadmap; this doc covers correctness, compliance, reliability, and ops.

- **Date:** 2026-07-18
- **Verdict:** **Not deployable to production.** Foundation is strong (policy-as-code,
  demo-proof fallback, migrations, health, security *plan*). **7 P0 blockers** remain —
  several are regulatory, not merely technical.
- **Scope reviewed:** `apps/api/src/agents/**`, `apps/api/src/policy/**`,
  `apps/api/src/api/routes.py`, `apps/api/src/config.py`, `apps/api/src/main.py`,
  `services/api-gateway`, product configs, `SECURITY.md`.

---

## 1. Architecture map (as-built)

```
POST /api/v1/assess ─► LangGraph agent (1 node: process_application)
                          │
                          ├─ seed_application()         # demo data hardcoded in graph.py
                          ├─ load_product_config()      # products/*.yaml (config-driven ✅)
                          ├─ run(PlannerSpec)            # DAG produced ... then IGNORED
                          ├─ _run_configured_agents()    # SEQUENTIAL for-loop (not parallel)
                          │    └─ run_agent(spec) ─► worker HTTP (env) OR run(spec) local
                          │         └─ run(): if OPENAI_API_KEY ─► LLM produces WHOLE verdict
                          │                    else            ─► spec.fallback() = deterministic tools
                          ├─ veto → replan loop (cap 2)   # the real demo, works ✅
                          ├─ Critic (lane 3 only)
                          ├─ write_approval_ticket + post_audit
                          └─ _summarize()
```

**Key structural facts:**
- The "graph" is a single imperative node. LangGraph is a 1-node wrapper; DAG channels,
  conditional edges, and fan-out are unused.
- The Planner emits a `DAG(nodes, edges)` that **no scheduler executes**. Agents run in a
  plain sequential loop ([`graph.py:101`](../apps/api/src/agents/graph.py)).
- LLM is invoked in exactly one place: `runner._try_llm` via `run()`
  ([`runner.py:24`](../apps/api/src/agents/harness/runner.py)).

---

## 2. Findings by layer

### 2.1 Data
| Item | State |
|---|---|
| Application input | Hardcoded in `seed_application()`; real path exists (`/assess/application`). OK. |
| Policy data | ✅ `policy/rules/*.yaml` — versioned, `effective_from/to`, `verified` flag. Correct "hard limits = data". |
| DB | Optional (`database_url=""` → in-memory). Audit ledger only. Alembic + split direct/runtime URL ✅. |
| Vector store | ❌ `chroma_persist_dir` config exists but `chromadb` is **commented out** in requirements. Dead config. |

### 2.2 Agent flow (graph) — the graph is decorative
- DAG never scheduled; "Credit + Operations in parallel" is a **sequential loop** — no
  `asyncio.gather`, no edge parallelism.
- Veto → replan → re-execute loop works and is the one live piece of orchestration.

### 2.3 Node processing
- Deterministic fallbacks (`*_fallback`) are the **real business logic**: they call tools,
  compute DTI/LTV, evaluate policy. This code is correct and auditable.
- Tool whitelist enforced in `harness/dispatch.py` (not prompt) ✅.
- Critic is read-only by construction ✅.

### 2.4 Where the LLM is called — **inverted design**
When `OPENAI_API_KEY` is set, `_try_llm` runs
`get_llm().with_structured_output(spec.output).invoke(...)` — the LLM produces the **entire
structured verdict** (`dti`, `ltv`, `valuation`, `veto`, `rule_ids`, Critic `passed`).
Deterministic tools run **only in the no-key fallback path**.

Consequence: enabling the LLM breaks **all five golden rules simultaneously**
(`AGENTS.md` §0):
1. LLM produces numbers (DTI/LTV/valuation) — hallucinated.
2/3. LLM sets `veto`/`rule_ids` — policy YAML bypassed.
5. Critic `passed` becomes LLM opinion — the auditor becomes un-auditable.

The demo only appears correct **because no API key is set** → always falls to deterministic
fallback. In production with a real key, decisions become non-deterministic and unverifiable.

Also missing on the LLM path: no `bind_tools` (LLM never calls a tool), no real system
prompt (one-liner prompts), no agentic plan→tool→observe loop. There is no LLM reasoning —
only deterministic Python plus an optional hallucination layer.

### 2.5 Knowledge base / RAG — **does not exist**
`kb="retail_lending" | "regulation" | "collateral"` are **string labels only**. No retriever,
no embeddings, no document corpus, no vector store. `AGENTS.md` §0's promise "retrieve
regulatory knowledge via RAG" is unbuilt. `Citation` objects carry hardcoded strings, not
retrieved excerpts.

**Where a KB is actually needed** (RAG feeds *prose + citations only* — never numbers/veto,
which stay in policy YAML):

| Agent | KB namespace | Content |
|---|---|---|
| Compliance | `regulation` | Thông tư / Luật các TCTD text → real `legal_basis` excerpts |
| Credit | `retail_lending` | Internal lending guidelines → narrative rationale |
| Operations | `collateral` | Valuation rules, doc-checklist rationale |
| Planner | — | Already served by product config (no RAG) |

---

## 3. P0 — Deploy blockers

| # | Blocker | Evidence | Fix |
|---|---|---|---|
| P0-1 | **Customer PII sent to OpenAI (US)** — CCCD, income, name go into the LLM payload. Violates SBV / Nghị định 13/2023 cross-border PII rules. | `runner.py:46`, `context.assemble` sends `spec.reads` slices incl. `application.declared` | On-prem / VN-region model, **or** redact PII before the LLM call (send anonymized metrics only) |
| P0-2 | **LLM produces numbers + veto** — non-deterministic, unverifiable credit/compliance decisions. | `runner.py:33` `with_structured_output(full verdict)` | LLM emits prose fields only; numbers/veto/`rule_ids`/Critic always from tools + policy |
| P0-3 | **Non-reproducible decisions** — `temperature=0.7`, model not pinned to a dated snapshot. | `config.py:26`, `config.py:25` | `temperature=0`; pin `gpt-4o-mini-2024-07-18`; log prompt+response+model version to audit |
| P0-4 | **Zero auth on the API** — no JWT/RBAC; `/approvals` (human sign-off) open to anyone; CORS `methods/headers=["*"]` + `allow_credentials`. | `main.py:28`, `api-gateway/app/main.py`, `routes.py:81` | Gateway JWT validation; `approver`-only `/approvals` (SECURITY.md §7 demo tier as start) |
| P0-5 | **Blocking I/O in the async loop** — sync `urllib.urlopen` inside `await agent.ainvoke`. One worker ≈ one concurrent request. | `cic.py:63`, `worker_client.py:52`, `aml.py`, `property.py`, `audit_client.py` | Replace with `httpx.AsyncClient` |
| P0-6 | **Internal errors leaked to clients** — `HTTPException(500, detail=str(e))` exposes stack/DSN. | `routes.py:38,52,77,101` | Generic client error; log details server-side |
| P0-7 | **No idempotency** — every `/assess` writes a new ticket + audit row; retries duplicate loan tickets. | `graph.py:216`, `graph.py:224` | Idempotency key on assess/ticket write |

---

## 4. P1 — Reliability / ops

- **Fake observability:** `cost` always 0, `tokens_in = len(str(messages))`, logging via
  `print()` (`main.py:14`). No structured logs, no cross-service trace id, no metrics. Add
  OpenTelemetry + real token/cost accounting.
- **No LLM timeout / backoff / circuit breaker:** `ChatOpenAI` defaults; `_try_llm` retries
  the same failure twice with no backoff.
- **PII in logs:** `logger.warning(..., exc)` may log payloads containing CCCD — violates
  SECURITY.md §9.
- **13 services for one flow:** high prod operational surface (13 deploys, health checks,
  secret sets) for current volume. Consider collapsing to monolith + `policy-svc`; re-extract
  under real load.
- **Config sprawl:** 10 product YAMLs + `catalog-svc` = duplicate source of truth. Converge on one.

## 5. P2 — Hardening
- RAG not built → "expert agent" is hollow (feature-P0; deploy-P2).
- Rate limiting / WAF in front of the gateway.
- Prod migration + rollback runbook; secret rotation (SECURITY.md §8 S-E).
- Execute the DAG for real parallelism (latency under real load).

---

## 6. Already production-grade (credit where due)
Policy-as-code (versioned, effective-dated, `verified` flag) · demo-proof external-call
fallbacks · CIC consent 403 gating · Alembic with split direct/runtime pooler URLs · health
check that never raises · `SECURITY.md` 5-layer auth roadmap · append-only audit ledger design.

---

## 7. Remediation sequence (production path)
1. **P0-2 + P0-3** — lock the LLM out of numbers/veto; `temperature=0`; pin model; log for
   audit. (Root fix; makes the other legal blockers tractable.)
2. **P0-1** — redact PII before the LLM (or commit to a VN-region model). Gate before any
   real-data run.
3. **P0-4** — JWT at the gateway + `approver`-only `/approvals`.
4. **P0-5** — `urllib` → `httpx` async.
5. **P0-6 + P0-7** — error masking + idempotency key.
6. **P1** observability, then **P2** RAG.

Each item ships as its own small PR (`AGENTS.md` §5) with a handoff note (`AGENTS.md` §2).
