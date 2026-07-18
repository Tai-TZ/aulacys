# Database-per-service — connection design & deployability

> How each service that needs state connects its OWN database, and how the whole set
> deploys. Follows the microservice rule: **a service owns its DB; nobody else touches
> it; no shared tables, no cross-service FK** (`ARCHITECTURE-services.md` §13).
> Keeps the demo-proof fallback: no `DATABASE_URL` ⇒ SQLite / in-memory, nothing crashes.

## 1. Which services need a DB (and which do NOT)

| Service | State? | DB | Why |
| ------- | ------ | -- | --- |
| **audit-svc** | mutable, append-only | **own Postgres** (`audit_db`) | immutable ledger — the inspector record |
| **los-svc** | mutable | **own Postgres** (`los_db`) | loan tickets (system of record) |
| **orchestrator-svc** | run history | **own Postgres** (`orchestrator_db`) | `loan_run` (trace snapshot, idempotency) — optional |
| policy-svc | rules | ❌ (YAML today) | promote to `policy_db` only if you want rule-change history |
| cic / aml / property-svc | reference | ❌ (JSON seed) | read-only, ships in image |
| income / api-gateway / agent-worker | none | ❌ | stateless |

**So 2 services need a DB now (audit, los), a 3rd later (orchestrator `loan_run`).** The
rest stay file/stateless — do NOT give them a DB just for symmetry.

## 2. Connection pattern (identical for every DB-owning service)

Each service ships this, self-contained (no import from another service):

```
services/<svc>/app/
  core/config.py        # DATABASE_URL (+ DIRECT_URL for migrations), SQLITE_PATH fallback
  repositories/<x>.py   # SQLAlchemy engine + session; the ONLY place touching the DB
  models.py             # SQLAlchemy models (own Base)
migrations/             # the service's OWN Alembic (never another service's)
  env.py  versions/
alembic.ini
```

**Engine selection (demo-proof):**
```python
# core/config.py
DATABASE_URL = os.getenv("DATABASE_URL", "")          # postgres in prod
SQLITE_PATH  = os.getenv("AUDIT_DB", "audit.db")      # fallback for demo

def make_engine():
    if DATABASE_URL.startswith("postgres"):
        url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")
        return create_engine(url, pool_pre_ping=True)
    return create_engine(f"sqlite:///{SQLITE_PATH}")   # demo / local
```
- `DATABASE_URL` set ⇒ Postgres. Unset ⇒ SQLite. **Same code, same tests, both paths.**
- Use **sync** SQLAlchemy + `psycopg` (v3) for these small services — simpler than async;
  they are not high-QPS. (asyncpg only where a service already runs async.)

**Each service owns its Alembic.** `services/audit-svc/migrations/` migrates only
`audit_record`/`audit_violation`. `los-svc` only `loan_ticket`. No cross-service DDL.

## 3. Deploy topology — three options

### (A) One Postgres, database-per-service — RECOMMENDED (hackathon → early prod)
One Postgres server, one **database per service** (`audit_db`, `los_db`, `orchestrator_db`).
Same isolation as separate servers (no shared tables) but one thing to run.

```yaml
# docker-compose.services.yml (add)
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: devpass
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./deploy/postgres-init:/docker-entrypoint-initdb.d   # creates audit_db, los_db, ...
    ports: ["5432:5432"]

  audit-svc:
    environment:
      DATABASE_URL: postgresql://postgres:devpass@postgres:5432/audit_db
    depends_on: [postgres]

  los-svc:
    environment:
      DATABASE_URL: postgresql://postgres:devpass@postgres:5432/los_db
    depends_on: [postgres]
volumes: { pgdata: {} }
```
`deploy/postgres-init/01-create-dbs.sql`:
```sql
CREATE DATABASE audit_db;
CREATE DATABASE los_db;
CREATE DATABASE orchestrator_db;
```

### (B) Postgres-per-service — full isolation (production)
One Postgres **container/instance per service**. Maximum isolation + independent
scaling/backup, but more to run. Use in K8s with a managed DB per service.

### (C) Supabase, schema-per-service
One Supabase project, a **schema** per service (`audit`, `los`); each service's role can
only see its schema. Cheapest managed option; weaker isolation than (A)/(B).

**Pick (A) now.** Move to (B) in production if a service needs independent DB scaling.

## 4. Running migrations on deploy

Migrations run **before** the service serves traffic, per service:
- **compose:** a one-shot `<svc>-migrate` job (`command: alembic upgrade head`) with
  `depends_on: postgres`, then the service starts.
- **K8s:** an **initContainer** or a **Job** per service running `alembic upgrade head`
  against that service's DB.
- Each service image bundles its own `alembic.ini` + `migrations/`.

```yaml
  audit-migrate:
    build: ./services/audit-svc
    command: ["alembic", "upgrade", "head"]
    environment: { DATABASE_URL: postgresql://postgres:devpass@postgres:5432/audit_db }
    depends_on: [postgres]
```

## 5. Per-service work to enable Postgres (small, per service)

For **audit-svc** and **los-svc** (each is one PR):
1. Add `core/config.py` (engine selection above).
2. Move `app/db.py` logic into `repositories/*.py` using SQLAlchemy models instead of raw
   `sqlite3` (keeps the same functions: `append_record`, `verify_chain`, `upsert_ticket`).
3. Add `models.py` (own `Base`) + `migrations/` (Alembic) + `alembic.ini`.
4. For audit: add the **UPDATE/DELETE triggers** in audit-svc's Postgres migration (trigger
   SQL is in `DATA-INTEGRITY-AND-STORAGE.md` §3 — append-only defence-in-depth).
5. Keep SQLite fallback so `docker compose` without Postgres and the tests still pass.
6. Compose: add `postgres` + `DATABASE_URL` + a migrate job (§3–4).

**orchestrator-svc `loan_run`** (later): add the `loan_run` model + own Alembic and write
it best-effort at the end of the run. Do NOT let it write `audit_*` — audit-svc owns audit.

## 6. Config reference (env per DB-owning service)

| Service | Runtime | Migrations | Fallback |
| ------- | ------- | ---------- | -------- |
| audit-svc | `DATABASE_URL` (→ `audit_db`) | same (small svc, sync) | `AUDIT_DB` SQLite |
| los-svc | `DATABASE_URL` (→ `los_db`) | same | `LOS_DB` SQLite |
| orchestrator-svc | `DATABASE_URL` :6543 | `DIRECT_URL` :5432 | in-memory |

Secrets: never in git. Compose = dev password; production = K8s Secret / Vault / managed-DB
credentials injected as env.

## 7. Verify (per service)

```bash
# with Postgres up + DATABASE_URL set
alembic upgrade head
curl -s localhost:8200/verify          # audit chain intact on Postgres
curl -s localhost:8200/health          # {status, intact, records}
# without DATABASE_URL -> SQLite fallback, same endpoints pass
```

## 8. Summary

- **2 DBs now** (audit, los) + **1 later** (orchestrator). Everything else stays
  file/stateless — resist DB-for-symmetry.
- **Pattern:** each service = own engine + own Alembic + `DATABASE_URL`, SQLite fallback.
- **Deploy:** one Postgres, **database-per-service** (A) via compose init + per-service
  migrate job; production → per-service managed DB (B) with a K8s migrate Job.
- **Isolation rule holds:** no shared tables, no cross-service FK, each service migrates
  only its own schema.
