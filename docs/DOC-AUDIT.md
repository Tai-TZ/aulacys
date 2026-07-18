# Documentation audit — readiness for production coding

> Assessment of the whole `docs/` set: coverage, quality, gaps. Verdict at the end.
> Done by inspecting all 20 top-level docs + 16 handoffs.

## Verdict (read first)

**Demo documentation: complete and rich.** **Production documentation: NOT ready as a
set.** It is functionally thorough but **sprawling** (20 docs, heavy overlap), has a
few **stale/contradictory** files, and is **missing several production-critical docs**
(test strategy, security/threat model, ops runbook, CI/CD, a single env reference,
production deploy for the *services*). Fix the 3 blocks below **before** coding toward
production, or new work will build on contradictions.

## 1. Coverage matrix (what production needs)

| Area | Doc(s) | Status |
| ---- | ------ | ------ |
| Vision / scope | `00-START-HERE`, SHB Solution-Design v1+v2 | ⚠️ stale scenario + 2 competing design docs |
| Architecture | `SYSTEM-ARCHITECTURE`, `ARCHITECTURE-services`, `OVERVIEW`, `architecture_diagram` | ⚠️ 4 docs, 1 stale |
| Data model | `DATA_DICTIONARY`, `DATA-INTEGRITY-AND-STORAGE` | ✅ good |
| DB / storage | `DATABASE`, `DATA-INTEGRITY-AND-STORAGE` | ✅ (audit dup flagged) |
| API contract | `API.md` | ⚠️ prose only, no generated OpenAPI/contract governance |
| Deploy | `DEPLOY` | ❌ monolith only — **no production deploy for the 9 services** |
| Build plan | `CODING-PLAN`, `NEXT-STEPS`, `SERVICE-CODING-PLAN`, `MICROSERVICES-STATUS` | ⚠️ 4 overlapping "next" docs |
| Production hardening | `MICROSERVICES-PRODUCTION-REPORT` | ✅ good |
| Team process | `TEAM_RULES`, `BRANCHING` | ✅ |
| **Testing strategy** | — | ❌ **missing** (tests exist; no strategy) |
| **Security / threat model** | — | ❌ **missing** (auth/secrets/mTLS only mentioned) |
| **Observability / runbook** | — | ❌ **missing** (no SLO, alerts, incident, rollback) |
| **CI/CD** | — | ❌ **missing** (no pipeline doc) |
| **Env / config reference** | scattered in `NEXT-STEPS`, `MICROSERVICES-STATUS` | ❌ **no single source** |

## 2. Stale / contradictory (fix before building)

1. **`00-START-HERE.md`** — still says the corporate 20bn scenario is "chốt"; `AGENTS.md`
   §0 + the code are retail. Every agent reading it builds the wrong story. (Also in
   `NEXT-STEPS` step 2.)
2. **`architecture_diagram.md`** — a **generic single-agent** flow (Parse→Analyze→Need
   Tool?→Generate), LLM "GPT-4o/Gemini", "Vector Store ChromaDB". None of this is the real
   system: no veto→replan, RAG not built, and it contradicts `SYSTEM-ARCHITECTURE.md`.
   **Retire or replace.**
3. **Audit duplication** — Postgres audit tables (`migration 0001`, orphaned) vs
   audit-svc SQLite (live). Flagged in `DATA-INTEGRITY §2`; decision still open.
4. **Two Solution-Design docs** (v1 1252 lines, v2 513) — which is authoritative? Mark one
   as superseded.
5. **RAG / Vector Store** — referenced as present in `architecture_diagram`, `config.py`
   (`chroma_persist_dir`) but **not implemented**. Docs imply a capability that doesn't exist.

## 3. Redundancy (consolidate)

- **"What to do next" × 4:** `CODING-PLAN`, `NEXT-STEPS`, `SERVICE-CODING-PLAN`,
  `MICROSERVICES-STATUS` (next section). Pick **one** canonical roadmap; make the others
  point to it.
- **Architecture × 4:** `OVERVIEW` (map), `SYSTEM-ARCHITECTURE` (current), `ARCHITECTURE-
  services` (design), `architecture_diagram` (stale). Keep 3, delete the stale one.
- **Data × 3:** `DATA_DICTIONARY`, `DATA-INTEGRITY-AND-STORAGE`, `DATABASE` — OK but add
  cross-links so they don't drift.

## 4. Missing docs to write before production

| Doc | Must contain |
| --- | ------------ |
| `TESTING.md` | unit/contract/integration strategy, per-service test expectations, coverage bar, how to run all |
| `SECURITY.md` | authn/z model, service-to-service (mTLS/JWT), secrets management, input hardening, threat model |
| `OBSERVABILITY.md` + `RUNBOOK.md` | OTel/metrics/logs plan, SLOs, alerts, on-call, incident + rollback steps |
| `CI-CD.md` | build/test/scan/deploy pipeline per service, image registry, GitOps |
| `CONFIG.md` (env reference) | every env var, per service, defaults, required-for-prod — one table |
| `DEPLOY.md` (extend) | production deploy for the 9 services (compose→K8s), not just monolith |
| `openapi/` (generated) | export each service's OpenAPI; version + contract tests |

## 5. Action plan (before production coding)

1. **Fix contradictions (fast):** rewrite `00-START-HERE` scenario; delete/replace
   `architecture_diagram.md`; mark one Solution-Design superseded; resolve audit dup
   (`DATA-INTEGRITY §2` → pick A); remove RAG claims until built.
2. **Consolidate:** add `INDEX.md` (one entry point) + collapse the 4 "next" docs into one
   roadmap; delete the stale architecture doc.
3. **Fill the 5 production docs** in §4 (TESTING, SECURITY, OBSERVABILITY+RUNBOOK, CI-CD,
   CONFIG) + extend DEPLOY for services.
4. **Then** start production coding (`MICROSERVICES-PRODUCTION-REPORT` P-A → P-I).

> Bottom line: the docs prove the demo well. For production, spend one focused pass on
> §5.1–§5.3 (contradictions + consolidation + the 5 missing docs) so nobody codes prod on
> a stale or contradictory base.
