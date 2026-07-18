# Database — Supabase Postgres

**Decision:** persistence = **Supabase Postgres**, reached from the FastAPI backend via
**SQLAlchemy 2.0 async (asyncpg)** with **Alembic** migrations. (Logged in `TEAM_RULES.md` §6.)

> Why not Prisma? Prisma is a Node/TS ORM; its Python client is community-maintained and
> drags a Node toolchain into the Python image — more moving parts to break on stage.
> SQLAlchemy+asyncpg is the boring, production-proven Postgres path for FastAPI. The
> Supabase connection URLs are identical either way.

## Rule: the API owns the data (AGENTS.md §1.3)

Only `apps/api` touches the DB. The Next.js frontend never connects to Postgres — it
calls the REST API. One contract, one source of truth. Do **not** add Prisma/`@supabase/*`
to `apps/web`.

## Two URLs, two jobs

Supabase gives two pooled connection strings. They are **not** interchangeable:

| Env var        | Port | Pooler mode  | Used for            | Notes |
|----------------|------|--------------|---------------------|-------|
| `DATABASE_URL` | 6543 | transaction  | **runtime queries** | `pgbouncer=true`, IPv4-safe. No prepared statements / no session state. |
| `DIRECT_URL`   | 5432 | session      | **migrations only** | Real session — needed for DDL + Alembic advisory locks. |

```
                         apps/api (FastAPI)
   request ──► route ──► get_db() ──► AsyncSession ──┐
                                                     │ DATABASE_URL :6543 (transaction pooler)
                                                     ▼
   alembic upgrade ─────────────────────────────►  Supabase Postgres
                          DIRECT_URL :5432 (session pooler)
```

### Why the runtime engine is configured the way it is (`src/db/session.py`)
PgBouncer **transaction mode** hands a different backend connection per transaction, so
server-side prepared statements and session state are unsafe. Therefore:
- `connect_args={"statement_cache_size": 0}` — disable asyncpg's prepared-statement cache.
- `poolclass=NullPool` — the pooler already pools; a second client-side pool fights it.
- The `?pgbouncer=true` query param is stripped before handing the URL to asyncpg (it's a
  Prisma-ism the driver doesn't understand).

## Demo-proof fallback (AGENTS.md §6)

- Both URLs blank ⇒ DB layer **disabled**, app runs in-memory. Nothing crashes.
- `db.ping()` never raises; `/health` reports `db: "up" | "down" | "disabled"`.
- A dead DB must never 500 the demo path — read/degrade, don't crash.

## Setup

```bash
cd apps/api
cp .env.example .env         # fill DATABASE_URL + DIRECT_URL from Supabase
pip install -r requirements.txt
# verify connectivity:
uvicorn src.main:app --reload   # then GET /health -> {"db":"up"}
```

Secrets: `.env` is git-ignored — **never commit the password**. Production: set
`DATABASE_URL` + `DIRECT_URL` in the Render dashboard (`sync:false`), not in git.

## Migrations (Alembic)

```bash
make revision m="add users table"   # autogenerate from models in src/db/models/
make migrate                        # apply (uses DIRECT_URL :5432)
make downgrade                      # roll back one
```

Workflow: define a model → import it in `migrations/env.py` → `make revision` → review the
generated file → `make migrate` → commit the migration. Never edit a DB by hand; migrations
are the only source of schema truth (this is what "avoid fixing it many times" buys you).

## Tables today

| Domain | Tables | Location |
|--------|--------|----------|
| Audit (immutable) | `audit_record`, `audit_violation` | `apps/api` — Alembic `0001` |
| Product catalog | `product_group`, `loan_product` | `apps/api` — Alembic `0002`; see `docs/PRODUCT-CATALOG-SCHEMA.md` |
| Application intake | `loan_application` + applicant tree + `application_document` | `services/application-svc` — see `docs/APPLICATION-SCHEMA.md` |

## Adding a model

```python
# src/db/models/user.py
from sqlalchemy.orm import Mapped, mapped_column
from src.db.base import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)
```
Import the module from `src/db/models/__init__.py`, run `make revision m="users"`,
review, `make migrate`.
