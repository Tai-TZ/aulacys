# audit-svc — Postgres-only ledger (docs/CONFIG.md)

## Env (required)

```bash
# Connect to Postgres via the shared transaction-mode pooler (IPv4-only)
DATABASE_URL="postgresql://postgres.[keydb]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&options=-csearch_path%3Daudit"

# Connect to Postgres via the shared session-mode pooler (used for migrations)
DIRECT_URL="postgresql://postgres.[keydb]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?options=-csearch_path%3Daudit"

DB_SCHEMA=audit
```

## Run

```bash
alembic upgrade head
uvicorn app.main:app --port 8200

# Postgres required — start local DB then:
#   docker compose -f docker-compose.db.yml up -d --wait
#   REQUIRE_DB=1 pytest -q
# Or all three DB services:  .\scripts\test-db.ps1   /  make test-db
pytest -q
```

## Schema

`audit_record` + `audit_violation` — see `schema.sql` / `app/db/models.py`.
