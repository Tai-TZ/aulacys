# los-svc — Postgres-only tickets (docs/CONFIG.md)

## Env (required)

```bash
# Connect to Postgres via the shared transaction-mode pooler (IPv4-only)
DATABASE_URL="postgresql://postgres.[keydb]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&options=-csearch_path%3Dlos"

# Connect to Postgres via the shared session-mode pooler (used for migrations)
DIRECT_URL="postgresql://postgres.[keydb]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?options=-csearch_path%3Dlos"

DB_SCHEMA=los
```

## Run

```bash
alembic upgrade head
uvicorn app.main:app --port 8310
# Postgres: docker compose -f docker-compose.db.yml up -d --wait
# REQUIRE_DB=1 pytest -q   (or make test-db / scripts/test-db.ps1)
pytest -q
```

Tables: `loan_ticket`, `ticket_history` — `schema.sql`.
