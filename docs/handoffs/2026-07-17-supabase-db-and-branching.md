# Handoff — Supabase DB layer + develop/main branching

- **Date:** 2026-07-17
- **Author:** Claude (agent) + nttoan189
- **Branch / PR:** `develop` (bootstrap commit b3c977a)
- **Status:** ✅ Done (DB layer + docs); ⛔ live connection pending real Supabase password

## What changed & why
Two things. (1) Persistence moved from in-memory to **Supabase Postgres**, reached from
FastAPI via **SQLAlchemy 2.0 async (asyncpg)** with **Alembic** migrations. Chose SQLAlchemy
over Prisma (Prisma is a Node ORM; its Python client + Node toolchain is the rework risk we
want to avoid for a deployed project). (2) Git model moved to **`develop` (integration) +
`main` (production)** with release + hotfix flow.

## Files touched
- `apps/api/src/db/` — `base.py` (DeclarativeBase), `session.py` (async engine, `get_db`, `ping`, `dispose`)
- `apps/api/src/config.py` — `database_url` + `direct_url` + `db_enabled`
- `apps/api/src/main.py` — `/health` now reports `db`; `dispose()` on shutdown
- `apps/api/migrations/` + `alembic.ini` + `Makefile` (migrate/revision/downgrade)
- `apps/api/requirements.txt` — sqlalchemy[asyncio], asyncpg, alembic
- `apps/api/.env.example` — Supabase DATABASE_URL (:6543) + DIRECT_URL (:5432) templates
- `apps/api/tests/test_db/` — url normalization + disabled fallback + health tests
- `docs/DATABASE.md` (new), `docs/BRANCHING.md` (rewritten), `docs/handoffs/` (new)
- Synced: `AGENTS.md`, `docs/TEAM_RULES.md`, `docs/architecture_diagram.md`, `.github/workflows/ci.yml`, PR template

## How to run / verify
```bash
cd apps/api && make check          # ruff clean + 11 tests pass (no DB needed)
# live DB:
cp .env.example .env               # fill DATABASE_URL + DIRECT_URL from Supabase
make migrate                       # once models exist
make run                           # GET /health -> {"db":"up"}
```
Verified: `make check` green (11 passed). URL normalizer strips `?pgbouncer=true`, engine
builds with statement cache off + NullPool. Live connect NOT yet run (needs real password).

## Contract impact
None. `schemas.py` unchanged; `/health` gained a `db` field (additive).

## Follow-ups / TODO
- [ ] Put real Supabase `DATABASE_URL` + `DIRECT_URL` in `apps/api/.env` (local) and Render dashboard (`sync:false`).
- [ ] Add `DATABASE_URL`/`DIRECT_URL` to `render.yaml` env list (currently only OPENAI/CORS).
- [ ] Define first model in `src/db/models/`, uncomment import in `migrations/env.py`, `make revision` → `make migrate`.
- [ ] On GitHub: set default branch = `develop`, add branch protections (see `docs/BRANCHING.md`), push `develop`.

## Gotchas
- Two URLs are NOT interchangeable: runtime = `:6543` transaction pooler; migrations = `:5432` DIRECT_URL. Alembic must use DIRECT_URL (DDL/advisory locks need a real session).
- Transaction pooler forbids prepared statements → `statement_cache_size=0` + `NullPool` are mandatory; don't "optimize" them away.
- Empty URLs = DB disabled (in-memory fallback) by design — that's why CI stays green without secrets. `ping()` never raises.
- `main` is production; never branch features off it (branch off `develop`). Hotfixes off `main`, then back-merge to `develop`.
