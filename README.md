# Digital Expert Agents for SHB (`aulacys`)

> Bank loan approval stalls in the queues between departments and the rework when a
> violation is caught too late → a multi-agent system where specialist agents (Credit,
> Operations, Compliance) plan, call deterministic tools, and **execute real actions**,
> with a policy-as-code Compliance veto → replan loop → for bank credit & compliance teams.

> Specialist agents that **plan, call banking tools, enforce hard legal limits as code, and write real LOS tickets** — not a chatbot that only returns prose.

| | |
|---|---|
| **Live admin (Cloud Run)** | https://web-hnwyafogwq-as.a.run.app/admin |
| **Alt URL (same service)** | https://web-969749992460.asia-southeast1.run.app/admin |
| **Start here (5 min)** | [`docs/00-START-HERE.md`](./docs/00-START-HERE.md) |
| **Agent rules (canonical)** | [`AGENTS.md`](./AGENTS.md) |

---

## Table of contents

1. [Problem → product](#problem--product)
2. [What it does](#what-it-does)
3. [How the AI works](#how-the-ai-works)
4. [Demo script](#demo-script)
5. [Architecture](#architecture)
6. [Quick start](#quick-start)
7. [Configuration](#configuration)
8. [API](#api)
9. [Deploy (GCP)](#deploy--gcp-cloud-run)
10. [Safety, limits & maturity](#safety-limits--maturity)
11. [Eval & presentation](#eval--presentation)
12. [Repo map & contributing](#repo-map--contributing)
13. [License](#license)

---

## Problem → product

Banks already digitized the **customer-facing** path. Lead time still sits in **queues between specialist desks** and late discovery of hard-policy breaches.

**Aulacys** targets the gap scorecards / STP cannot close: retail cases with **cross-desk conflict** and **hard legal limits** (e.g. declared “buy home” vs evidence of refinance at another bank).

| We build | We do **not** build (out of scope) |
|----------|-------------------------------------|
| Multi-agent DAG + policy-as-code veto → replan | Real core-banking / SHB production scorecard |
| Deterministic tools for DTI / LTV / … | Full document OCR |
| Audit ledger + LOS ticket write | Production RBAC (demo MCP roles only) |
| Two products via YAML config | Fine-tuning a foundation model |

Pitch framing: [`docs/00-START-HERE.md`](./docs/00-START-HERE.md) · design: [`docs/SHB-Digital-Expert-Agents-Solution-Design-v2.md`](./docs/SHB-Digital-Expert-Agents-Solution-Design-v2.md)  
⚠️ v1 design doc (no `-v2`) = **superseded corporate** scenario — do not build from it.

---

## What it does

### Wow flow (protect this above all else)

1. Retail **mortgage** application ingested  
2. **Planner** reads product config → builds DAG  
3. **Credit** + **Operations** run **in parallel**  
4. **Compliance** waits on valuation (needs LTV) → finds purpose contradiction → **vetoes on YAML hard limit**  
5. Planner **replans**  
6. **Critic** checks every number has a tool call / every claim a citation  
7. Human approves (HITL) → **ticket written** to LOS  

Same graph for **`retail_unsecured_salary`** (STP) — only product YAML changes.

### Admin product surface

- **Yêu cầu vay** — dossier list from `application-svc`  
- **Thẩm định** — multi-agent run with live node progress  
- **Phê duyệt / HITL** — human gate when required  
- **Sản phẩm** — retail product config UI  

Business stages (Tiếp nhận → RM → Thẩm định → Phê duyệt → Giải ngân): [`docs/FLOW-BUSINESS-CONFIRMED.md`](./docs/FLOW-BUSINESS-CONFIRMED.md).  
Agents concentrate on **Thẩm định**, not every stage.

---

## How the AI works

```
Planner (DAG from product YAML)
    ├─► Credit worker      ── tools: CIC, income, …
    ├─► Operations worker  ── tools: property / valuation, …
    ├─► Compliance worker  ── policy-svc hard limits → VETO edge
    └─► Critic             ── traceability of numbers & citations
         └─► LOS ticket + audit ledger
```

| Layer | Role |
|-------|------|
| **LLM (Gemini)** | Judgement, narrative, routing prose — **never invents DTI/LTV** |
| **Tools** | Deterministic calculations & external mocks (CIC, AML, property, …) |
| **Policy YAML** | Statutory / product hard limits with effective dates |
| **Harness** | Tool whitelist, veto as **graph edge**, in-process fallbacks |
| **Critic** | Rejects figures that cannot be traced to a tool call |

### Five rules that outrank convenience

1. An LLM never produces a number.  
2. Hard legal limits live in `policy/`, not in a prompt.  
3. The veto is a graph edge, not a suggestion.  
4. Tool whitelist is enforced by the harness.  
5. Anything that matters is structure or code — prompts hold voice only.

Details: [`docs/BUILD-GUIDE.md`](./docs/BUILD-GUIDE.md) §1 · [`docs/AGENT-SPEC.md`](./docs/AGENT-SPEC.md).

---

## Demo script

**Cloud (already deployed):** open [/admin](https://web-hnwyafogwq-as.a.run.app/admin) → **Yêu cầu vay** → open a dossier → **Tiếp nhận** / run thẩm định.

**Local seed keywords** (via `POST /api/v1/assess` or chat):

| Trigger in message | Product | Expected |
|--------------------|---------|----------|
| `tín chấp` / `unsecured` | `retail_unsecured_salary` | STP-style path |
| `mortgage` / default | `retail_mortgage` | Veto → replan → HITL path |

Or assess by DB id:

```bash
cd apps/api
bash scripts/setup.sh                                        # Linux / macOS / Git Bash
# Windows: powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
# edit .env → add GEMINI_API_KEY (primary LLM; OPENAI_API_KEY optional fallback), then:
make run          # or: uvicorn src.main:app --reload --port 8000
# Swagger UI: http://localhost:8000/docs
```

Materials: [`presentation/`](./presentation/) (deck + demo video checklist).

---

## Architecture

```
Browser (apps/web)
  │  NEXT_PUBLIC_APPLICATION_SVC_URL → application-svc
  │  NEXT_PUBLIC_API_URL             → orchestrator-svc
  │  NEXT_PUBLIC_GATEWAY_URL         → api-gateway
  ▼
api-gateway (:8080) —— GET /status
  ▼
orchestrator-svc (:8000) —— LangGraph + HTTP seams
  ├── policy · cic · aml · property · income · legal · catalog
  ├── application-svc (Postgres schema application)
  ├── audit-svc (schema audit) · los-svc (schema los)
  └── credit · operations · compliance · critic  (agent-worker ×4)
```

- Domain + **API contract**: `packages/shared/aulacys` (`models/schemas.py`)  
- Frontend mirror: `apps/web/lib/api.ts`  
- Runtime on **`main`**: `services/orchestrator-svc` (not a monolith-only `apps/api`)  
- Every seam: **HTTP if URL set, else in-process fallback** (demo never hard-crashes)

More: [`docs/SYSTEM-ARCHITECTURE.md`](./docs/SYSTEM-ARCHITECTURE.md) · [`docs/ARCHITECTURE-services.md`](./docs/ARCHITECTURE-services.md) · [`docs/MICROSERVICES-STATUS.md`](./docs/MICROSERVICES-STATUS.md).

### Services & ports

| Service | Port | Role |
|---------|------|------|
| web | 3000 | Next.js admin |
| api-gateway | 8080 | Front door / health rollup |
| orchestrator-svc | 8000 | Agents + `/api/v1/*` |
| application-svc | 8360 | Section A intake |
| audit-svc | 8200 | Immutable decision ledger |
| los-svc | 8310 | Approval tickets |
| policy-svc | 8100 | Hard limits (YAML) |
| cic / aml / property / income | 8300–8340 | Seed / mock tools |
| catalog / legal | 8350 / 8370 | Catalog & legal seed |
| credit / operations / compliance / critic | 8400–8404 | Agent workers (one Docker image) |

---

## Quick start

**Prereqs:** Python 3.11+ · Node 20+ · optional Docker · optional `gcloud`

### Windows stack (recommended)

```powershell
cd scripts
.\stack.ps1 up -Profile full -Force
# UI http://localhost:3000/admin · API http://localhost:8000/docs · Gateway http://localhost:8080/status
.\stack.ps1 down
```

### Core trio (manual)

```powershell
# Orchestrator
$env:PYTHONPATH = "$PWD\packages\shared;$PWD\services\orchestrator-svc"
cd services\orchestrator-svc   # .env from .env.example (GEMINI_API_KEY / GOOGLE_API_KEY)
python -m uvicorn app.main:app --reload --port 8000

# Application intake
cd ..\application-svc          # DATABASE_URL, DIRECT_URL, DB_SCHEMA=application
python -m uvicorn app.main:app --reload --port 8360

# Web
cd ..\..\apps\web
copy .env.example .env.local   # set NEXT_PUBLIC_* to localhost ports above
npm install && npm run dev     # :3000
```

### Docker

```bash
docker compose up --build
# or: docker compose -f docker-compose.services.yml up --build
```

---

## Configuration

| Concern | Where |
|---------|--------|
| Per-service env matrix | [`docs/CONFIG.md`](./docs/CONFIG.md) |
| Supabase schema-per-service | [`docs/SUPABASE-SCHEMA-PER-SERVICE.md`](./docs/SUPABASE-SCHEMA-PER-SERVICE.md) |
| Pooler / prepared statements | Engines strip `pgbouncer`; sync uses `prepare_threshold=None` + `NullPool` |
| Local secrets for GCP sync | `.env.production` (**gitignored**) — **not** loaded by local uvicorn |
| Web build-time URLs | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GATEWAY_URL`, `NEXT_PUBLIC_APPLICATION_SVC_URL` |

DB-owning services need `DATABASE_URL` (:6543) + `DIRECT_URL` (:5432) + `DB_SCHEMA`.

---

## API

| Source of truth | Path |
|-----------------|------|
| Pydantic contract | `packages/shared/aulacys/models/schemas.py` |
| TS client | `apps/web/lib/api.ts` |
| Swagger | `http://localhost:8000/docs` |

### Orchestrator

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness + db |
| `POST` | `/api/v1/chat` | Text summary |
| `POST` | `/api/v1/assess` | Structured assess (seed keyword) |
| `POST` | `/api/v1/assess/application` | Assess by body or `application_id` |
| `POST` | `/api/v1/approvals` | HITL → ticket |

### application-svc (browser → direct)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/applications` | List |
| `GET` | `/applications/{id}` | Detail |
| `POST` | `/applications` | Create (consent gate) |

Gateway: `GET /status`. Reference notes: [`docs/API.md`](./docs/API.md) (prefer OpenAPI if docs lag).

---

## Deploy — GCP Cloud Run

**Stack:** Cloud Run + Artifact Registry + Secret Manager + Supabase.

```powershell
gcloud auth login
gcloud config set project <PROJECT_ID>

# Sync secrets (never commit .env.production)
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-gcp-draft.ps1 `
  -ProjectId <PROJECT_ID> -EnvFile .env.production -SecretsOnly

# Build + deploy
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-gcp-draft.ps1 `
  -ProjectId <PROJECT_ID> -Region asia-southeast1
```

Scripts: [`scripts/deploy-gcp-draft.ps1`](./scripts/deploy-gcp-draft.ps1) · [`scripts/deploy-gcp-draft.sh`](./scripts/deploy-gcp-draft.sh) · guide: [`docs/DEPLOY-GCP.md`](./docs/DEPLOY-GCP.md).

**Secrets:** `gemini-api-key`, `orchestrator|application|audit|los`-`database-url` + `-direct-url`.

**Ops checklist (learned the hard way):**

1. Runtime SA needs `roles/secretmanager.secretAccessor`.  
2. `CORS_ORIGINS` on application + orchestrator + gateway must include **both** Cloud Run web hostnames (`*.a.run.app` and `*.run.app`).  
3. Do not wipe env with a lone `--env-vars-file` that only sets CORS — you will lose `APPLICATION_SVC_URL` / agent URLs → `502 APPLICATION_SVC_URL unreachable`. Prefer merge/`--update-env-vars`.  
4. `agent-worker-svc` image must install `packages/shared/requirements.txt` (needs `pydantic-settings`).

Legacy Render/Vercel: [`docs/DEPLOY.md`](./docs/DEPLOY.md).

---

## Safety, limits & maturity

| Topic | Reality today |
|-------|----------------|
| **Maturity** | Hackathon / draft public Cloud Run — **not** bank production |
| **AuthN/Z** | Demo admin shell; no production RBAC |
| **PII** | Consent gate on intake; treat seeds & Supabase as sensitive |
| **LLM** | Can fail → deterministic fallbacks keep the demo path alive |
| **Numbers** | Must come from tools; Critic enforces traceability |
| **Policy** | Code/YAML — models cannot “forget” a statutory cap |
| **Degrade** | Unset service URL → in-process path |

Security notes: [`docs/SECURITY.md`](./docs/SECURITY.md) · readiness: [`docs/PRODUCTION-READINESS.md`](./docs/PRODUCTION-READINESS.md).

---

## Eval & presentation

| Artifact | Path |
|----------|------|
| Eval report template | [`eval/results/report.md`](./eval/results/report.md) |
| Pitch / demo checklist | [`presentation/README.md`](./presentation/README.md) |
| Agent / build how-to | [`docs/BUILD-GUIDE.md`](./docs/BUILD-GUIDE.md) |
| Handoffs (what changed) | [`docs/handoffs/`](./docs/handoffs/) |

---

## Tech stack (locked)

| Layer | Choice |
|-------|--------|
| Agents | LangGraph + LangChain |
| LLM | Gemini `gemini-3.1-flash-lite` (OpenAI fallback) |
| API | FastAPI + Uvicorn · Pydantic |
| Web | Next.js 14 · React 18 · Tailwind (token UI) |
| Data | Supabase Postgres · SQLAlchemy · Alembic |
| Ship | GCP Cloud Run · Secret Manager · Artifact Registry |
| Quality | Ruff · pytest · `npm run build` |

Stack change = team decision → [`docs/TEAM_RULES.md`](./docs/TEAM_RULES.md).

---

## Repo map & contributing

```
apps/web/                 Next.js admin
services/*                Microservices (orchestrator, gateway, workers, …)
packages/shared/aulacys/  Shared agents + schemas + config
scripts/                  stack.ps1 · deploy-gcp-draft.*
docs/                     Product, architecture, deploy, handoffs
.claude/skills/           hackathon · handoff · ui-ux-system
AGENTS.md                 Single source of truth for AI coding agents
```

**Contributing (hackathon discipline):**

1. Read [`AGENTS.md`](./AGENTS.md) + [`docs/TEAM_RULES.md`](./docs/TEAM_RULES.md).  
2. Stay in the wow-flow slice — new feature/page/endpoint = ask the team.  
3. One contract: change `schemas.py` **and** `apps/web/lib/api.ts`.  
4. Branch off `develop` · Conventional Commits · small PRs ([`docs/BRANCHING.md`](./docs/BRANCHING.md)).  
5. Backend `make check` / frontend `npm run build` green · write a **handoff**.

**DoD:** runs E2E · fallbacks · contract synced · handoff in `docs/handoffs/`.

---

## Docs map

| Doc | Use when |
|-----|----------|
| [`docs/00-START-HERE.md`](./docs/00-START-HERE.md) | Mission & pitch |
| [`docs/BUILD-GUIDE.md`](./docs/BUILD-GUIDE.md) | Implement the wow slice |
| [`docs/FLOW-BUSINESS-CONFIRMED.md`](./docs/FLOW-BUSINESS-CONFIRMED.md) | 5-stage retail process |
| [`docs/DEPLOY-GCP.md`](./docs/DEPLOY-GCP.md) | Cloud Run + Supabase |
| [`docs/CONFIG.md`](./docs/CONFIG.md) | Env vars |
| [`docs/AGENT-SPEC.md`](./docs/AGENT-SPEC.md) | Agent contracts |
| [`AGENTS.md`](./AGENTS.md) | Rules for every AI tool on this repo |

---

## License

MIT
