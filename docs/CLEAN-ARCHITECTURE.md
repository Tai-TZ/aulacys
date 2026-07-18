# CLEAN-ARCHITECTURE — layering rules (RULE)

> **📌 DECIDED — binding.** How code is layered in this repo. Elaborates `AGENTS.md` §4
> (repo layout) into a dependency discipline. Points to `AGENTS.md`; never contradicts it.
> Change = team decision, logged in `docs/TEAM_RULES.md`.
>
> **One law:** *dependencies point inward.* Inner layers know nothing about outer layers.
> Business rules never import a framework, a driver, or an HTTP client.

---

## 0. The four layers (mapped to real dirs)

Inner → outer. Import arrows may only go **inward** (an outer layer imports an inner one,
never the reverse).

| Layer | Meaning | Backend (`apps/api/src`) | Frontend (`apps/web`) |
|---|---|---|---|
| **1. Domain** | Entities + pure business rules. No IO, no framework. | `agents/state.py`, `policy/loader.py` + `policy/rules/*.yaml`, pure maths in `agents/tools/loan_calculator.py` | `lib/*` pure types + label/format helpers (`labels.ts`, `workspace-demo.ts` data) |
| **2. Application** | Use-cases / orchestration. Depends on Domain only. | `agents/graph.py` (`process_application`), `agents/nodes/*` (specs + fallbacks), `agents/harness/*` (runner, dispatch, meter, trace) | page-level logic in `app/**/page.tsx`, hooks |
| **3. Interface adapters** | Translate between app and the outside. DTOs, controllers, gateways. | `api/routes.py`, `models/schemas.py` (THE contract), `agents/worker_client.py`, `agents/audit_client.py`, `agents/transport.py`, `policy/client.py`, `db/models/*` | `lib/api.ts` (backend client), `components/**` (presentational), `components/ui/*` (primitives) |
| **4. Frameworks / Drivers** | The volatile edge. | FastAPI, LangGraph, SQLAlchemy (`db/session.py`), `services/llm.py` (ChatOpenAI), external svc HTTP, `config.py` (env) | Next.js, Tailwind, fetch |

**Rule of thumb (`AGENTS.md` §0 rule 5):** *if the model/framework vanished, would this rule
still be true?* Yes → it belongs in Domain (layer 1). No → push it outward.

---

## 1. The Dependency Rule (what may import what)

| This layer | MAY import | MUST NOT import |
|---|---|---|
| Domain (1) | stdlib, pydantic, yaml | FastAPI, LangChain/LangGraph, SQLAlchemy, `httpx`/`urllib`, `services/llm`, `config` |
| Application (2) | Domain | FastAPI request/response types, DB session, raw HTTP |
| Interface (3) | Application, Domain | — (may touch drivers via injection) |
| Frameworks (4) | anything | (nothing imports *into* it except by interface) |

- **Cross a boundary only through a Domain type**, never a framework object. A node returns a
  `pydantic` model (Domain), not a `Response`.
- **Contract lives once** (`models/schemas.py`) and mirrors to `apps/web/lib/api.ts`
  (`AGENTS.md` §1.3). No second shape.

---

## 2. Per-layer DO / DON'T (with repo examples)

### Domain (1)
- ✅ `loan_calculator.py`: pure maths, returns `{value, inputs, formula}`, no IO. **This is the model.**
- ✅ `policy/loader.py`: table-driven rule eval, `@lru_cache`, no LLM, deterministic.
- ❌ **Do not** put network/LLM/DB in a Domain module. A figure comes from maths, not a call.

### Application (2)
- ✅ `harness/runner.py`: orchestrates assemble → (prose LLM opt-in) → fallback → trace.
- ✅ `harness/dispatch.py`: tool whitelist enforced here, not in a prompt.
- ❌ No FastAPI, no `HTTPException` — a node returns a typed dict/model, never raises to the wire
  (`AGENTS.md` §6).

### Interface adapters (3)
- ✅ `api/routes.py`: the ONLY place that raises `HTTPException` and shapes `AssessResponse`.
- ✅ `worker_client.py` / `policy/client.py`: swap in-process call ↔ HTTP by env, fallback inward.
- ❌ No business decision here — adapters translate, they don't judge.

### Frameworks (4)
- ✅ `services/llm.py`: the single `ChatOpenAI` construction. `config.py`: the single env read.
- ❌ Nothing in layers 1–2 imports these directly except through an injected boundary.

### Frontend
- ✅ Data fetching only in `lib/api.ts`; components are presentational and import it.
- ✅ Strings/labels centralized (`lib/labels.ts`); primitives from `components/ui` (`AGENTS.md` §8).
- ❌ No raw `fetch` in a component; no inline hex/color; no hard-coded business string.

---

## 3. Known violations to fix (this repo, today)

| # | Violation | Where | Fix |
|---|---|---|---|
| CA-1 | **IO + framework leak into "tools"** — external tools do `urllib` HTTP and carry the `@tool` decorator inside what should be Domain/adapter. | `agents/tools/cic.py`, `aml.py`, `property.py`, `income.py`, `workflow.py` | Split: pure Domain calc stays; the network call moves to an **adapter** (`*_client`) behind a port; `@tool` binding lives in the Application layer. |
| CA-2 | **Blocking IO in the async use-case** (also P0-5). | same tool/client files (`urllib.urlopen` under `await agent.ainvoke`) | `httpx.AsyncClient` in the adapter; Domain stays sync-pure. |
| CA-3 | **Fixture inside orchestration** — demo seed data in the app layer. | `agents/graph.py: seed_application` | Move seeds to `tests/` / a fixtures module; graph takes an application in, never invents one. |
| CA-4 | **Service-locator singleton** — `get_settings()` called ad-hoc deep in layers. | many modules | Read config at the edge (layer 3/4), pass values inward; Domain/App never call `get_settings()`. |

These are **layering debts**, not blockers. Fix opportunistically when touching the file;
don't refactor unrelated code mid-task (`AGENTS.md` §1.5).

---

## 4. Microservice shape (reference: `services/cic-svc`)
Each extracted service mirrors the same layering internally — use `cic-svc` as the template:
```
app/
  api/routes.py        # interface (controller)
  schemas/*.py         # interface (DTO)
  services/*.py        # application (use-case) + domain (scoring.py = pure maths)
  repositories/*.py    # interface (data access; seed/DB)
  core/config.py       # framework (env)
```
`scoring.py` (pure scorecard maths) = Domain; `routes.py` = Interface; `core/config.py` =
Framework. A service never reaches into another service's internals — only its HTTP contract.

---

## 5. Enforcement
- **Review checklist:** every PR — does any import cross a boundary outward? (Domain importing
  FastAPI/LangChain/httpx = reject.)
- **Optional automation:** add `import-linter` contracts (layers config) to `make check` so a
  violating import fails CI. (New dep → team decision, `AGENTS.md` §1.2.)
- **Fallback is a layer boundary, not an afterthought:** the deterministic path is the Domain
  truth; the LLM/HTTP path is an outer adapter that may fail back inward (`AGENTS.md` §6).

---

## 6. Wiring (proposed — needs approval)
- Add a pointer in `AGENTS.md` §4 → this file. *(§4 blast-radius: announce first.)*
- Log the decision in `docs/TEAM_RULES.md` → Decisions.
