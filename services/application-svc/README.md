# application-svc — SHBFinance Section A intake (docs/APPLICATION-SCHEMA.md)

Owns schema `application`. Replaces the guessed 8-field `DeclaredForm` for unsecured
consumer loans. Consent is a hard gate before any agent may process PII.

## Env (required)

```bash
# Connect to Postgres via the shared transaction-mode pooler (IPv4-only)
DATABASE_URL="postgresql://postgres.[keydb]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&options=-csearch_path%3Dapplication"

# Connect to Postgres via the shared session-mode pooler (used for migrations)
DIRECT_URL="postgresql://postgres.[keydb]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?options=-csearch_path%3Dapplication"

DB_SCHEMA=application
```

## Run

```bash
alembic upgrade head
uvicorn app.main:app --port 8360
# Postgres: docker compose -f docker-compose.db.yml up -d --wait
# REQUIRE_DB=1 pytest -q   (or make test-db / scripts/test-db.ps1)
pytest -q
```

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | liveness |
| `GET` | `/ready` | DB ping |
| `POST` | `/applications` | intake; **400** if `consent.data_processing_consent` is false |
| `GET` | `/applications/{id}` | full nested Section A |

## Schema

13 tables — see `schema.sql` / `docs/APPLICATION-SCHEMA.md` §2.
