# CONFIG — environment reference (per service)

> Every env var, per service, with default and whether it is required in production.
> Rule: config is **per-service**. Each service configures **(1) itself** and **(2) the
> addresses of services it calls** — nothing more. See `FLOW-AND-CALLS.md` for who calls whom.

## Legend

- **Kind:** `own` = this service's own setting · `addr` = URL of a service it calls · `secret` = must come from a secret store, never git.
- **Prod?** = required when deployed for real (✅), else optional/dev-only.
- **Unset behavior** for `addr`: the caller falls back to the in-process path (demo-proof).

---

## orchestrator-svc (`apps/api`, :8000)

| Var | Kind | Default | Prod? | Notes |
|-----|------|---------|-------|-------|
| `APP_ENV` | own | `development` | ✅ | `production` on deploy |
| `APP_PORT` | own | `8000` | — | |
| `CORS_ORIGINS` | own | `http://localhost:3000` | ✅ | exact web origin(s) |
| `LLM_PROVIDER` | own | `gemini` | ✅ | `gemini` (primary) or `openai` — TEAM_RULES 2026-07-18 |
| `GEMINI_API_KEY` | own · secret | `""` | ✅ (when Gemini wired) | Google AI Studio ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)); also accepts `GOOGLE_API_KEY` |
| `GEMINI_MODEL_NAME` | own | `gemini-3.1-flash-lite` | ✅ | used when `LLM_PROVIDER=gemini` |
| `OPENAI_API_KEY` | own · secret | `""` | — | used when `LLM_PROVIDER=openai`; agents deterministic until a key is set for the active provider |
| `MODEL_NAME` | own | `gpt-4o-mini` | — | OpenAI model id when provider=openai |
| `LLM_TEMPERATURE` | own | `0` | — | keep 0 for audit reproducibility (P0-3) |
| `DATABASE_URL` | own · secret | `""` | ✅ (for `loan_run`) | empty ⇒ in-memory |
| `DIRECT_URL` | own · secret | `""` | ✅ | migrations (:5432) |
| `POLICY_SVC_URL` | addr | `""` | ✅ | policy-svc |
| `AUDIT_SVC_URL` | addr | `""` | ✅ | audit-svc |
| `CIC_SVC_URL` | addr | `""` | ✅ | (used by Credit) |
| `INCOME_SVC_URL` | addr | `""` | ✅ | Credit |
| `PROPERTY_SVC_URL` | addr | `""` | ✅ | Operations |
| `AML_SVC_URL` | addr | `""` | ✅ | Compliance |
| `LOS_SVC_URL` | addr | `""` | ✅ | ticket write |
| `AGENT_WORKER_URL` | addr | `""` | ✅ | one agent runtime for Planner/Credit/Operations/Compliance/Critic |

## api-gateway (:8080)

| Var | Kind | Default | Prod? | Notes |
|-----|------|---------|-------|-------|
| `MONOLITH_URL` | addr | `http://127.0.0.1:8000` | ✅ | orchestrator to proxy to |
| `*_SVC_URL`, `AGENT_WORKER_URL`, `CATALOG_SVC_URL` | addr | localhost ports | ✅ | health-check targets |
| `CORS_ORIGINS` | own | `http://localhost:3000` | ✅ | web origin |

## audit-svc (:8200)

| Var | Kind | Default | Prod? | Notes |
|-----|------|---------|-------|-------|
| `DATABASE_URL` | own · secret | — | ✅ | **Postgres required.** Transaction pooler `:6543` + `pgbouncer=true` + `options=-csearch_path%3Daudit` |
| `DIRECT_URL` | own · secret | falls back to `DATABASE_URL` | ✅ | Session pooler `:5432` (Alembic) + same `search_path` |
| `DB_SCHEMA` | own | `audit` | — | used if URL has no `search_path` |

## los-svc (:8310)

| Var | Kind | Default | Prod? | Notes |
|-----|------|---------|-------|-------|
| `DATABASE_URL` | own · secret | — | ✅ | Same as audit but `search_path=los` |
| `DIRECT_URL` | own · secret | falls back to `DATABASE_URL` | ✅ | Session pooler + `search_path=los` |
| `DB_SCHEMA` | own | `los` | — | used if URL has no `search_path` |

## application-svc (:8360)

| Var | Kind | Default | Prod? | Notes |
|-----|------|---------|-------|-------|
| `DATABASE_URL` | own · secret | — | ✅ | `search_path=application` — SHBFinance Section A intake |
| `DIRECT_URL` | own · secret | falls back to `DATABASE_URL` | ✅ | Alembic |
| `DB_SCHEMA` | own | `application` | — | used if URL has no `search_path` |

## agent-worker-svc (:8400)

| Var | Kind | Default | Prod? | Notes |
|-----|------|---------|-------|-------|
| `AGENT_WORKER_URL` | caller addr | `""` | ✅ | Set on orchestrator/gateway, not on the worker itself |
| `CIC_SVC_URL`, `INCOME_SVC_URL` | addr | `""` | ✅ | Credit tools |
| `PROPERTY_SVC_URL` | addr | `""` | ✅ | Operations tools |
| `AML_SVC_URL`, `POLICY_SVC_URL` | addr | `""` | ✅ | Compliance tools |

## policy-svc (:8100) · cic (:8300) · aml (:8320) · property (:8330) · income (:8340) · catalog (:8350)

| Var | Kind | Default | Prod? | Notes |
|-----|------|---------|-------|-------|
| (seed/rules path) | own | in code | — | ship data in image; no runtime config |
| — | — | — | — | **no `addr` env — these call nobody** |

These 6 are read-only/stateless → effectively **no required env**. They call no service,
own no DB. (If a seed path is ever externalized, add one `own` var here.)

## web (`apps/web`, :3000)

| Var | Kind | Default | Prod? | Notes |
|-----|------|---------|-------|-------|
| `NEXT_PUBLIC_API_URL` | addr | `http://localhost:8000` | ✅ | **build-time**; orchestrator public URL |
| `NEXT_PUBLIC_GATEWAY_URL` | addr | `http://localhost:8080` | ✅ | gateway public URL (status board) |

> `NEXT_PUBLIC_*` is baked at **build** time — change it ⇒ rebuild the web image.

---

## Where env is set (deploy)

| Layer | How |
|-------|-----|
| Local dev | **per-service `.env`** (copy from `.env.example` in that folder) |
| docker-compose | each service block's `environment:` (`docker-compose.services.yml`) |
| GCP Cloud Run | `--set-env-vars` per service; secrets via `--update-secrets` |
| Secrets (`DATABASE_URL`, `OPENAI_API_KEY`, …) | **GCP Secret Manager** — stored centrally, but each service reads **only its own** |

### Local files (one folder = one service)

| Service | Template (git) | Local (gitignored) |
|---------|----------------|--------------------|
| orchestrator | `apps/api/.env.example` | `apps/api/.env` |
| api-gateway | `services/api-gateway/.env.example` | `services/api-gateway/.env` |
| audit-svc | `services/audit-svc/.env.example` | `services/audit-svc/.env` |
| los-svc | `services/los-svc/.env.example` | `services/los-svc/.env` |
| application-svc | `services/application-svc/.env.example` | `services/application-svc/.env` |
| agent-worker | `services/agent-worker-svc/.env.example` | `services/agent-worker-svc/.env` |
| policy / cic / aml / property / income / catalog | `services/<name>/.env.example` | `services/<name>/.env` |
| web | `apps/web/.env.example` | `apps/web/.env.local` |

```bash
# first-time setup (from repo root)
cp apps/api/.env.example apps/api/.env
cp services/audit-svc/.env.example services/audit-svc/.env
# …or copy each services/*/.env.example → .env
```

## Local / CI Postgres tests (audit · los · application)

```bash
# start Postgres only (schemas from services/db/init-schemas.sql)
docker compose -f docker-compose.db.yml up -d --wait

# Windows
.\scripts\test-db.ps1
# Unix / make
make test-db

# REQUIRE_DB=1 → skip becomes fail (used in CI job db-services)
```

Same Postgres credentials as `docker-compose.services.yml` (`postgres`/`postgres` @ `:5432`).


## ❌ Anti-patterns

- **Orchestrator holding another service's `DATABASE_URL`.** audit-svc/los-svc own their DB
  config. The orchestrator only knows their **URL** (`*_SVC_URL`), never their DB creds.
- **One giant shared `.env` for all services.** Each service reads only what it needs;
  a shared file leaks another service's secrets into every container.
- **Baking secrets into images / git.** Use Secret Manager (`*_SVC_URL` are not secret;
  `DATABASE_URL`/`OPENAI_API_KEY` are).

## Summary

- **own** config (DB, port, seed) → lives with the service that owns it.
- **addr** config (`*_SVC_URL`) → lives with the **caller** (orchestrator, gateway, agent-worker).
- Secrets stored centrally (Secret Manager), read per-service.
- 6 read-only/stateless services need essentially **no env**.
