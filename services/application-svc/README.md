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
| `GET` | `/applications` | list newest-first (`?limit=`) |
| `GET` | `/applications/{id}` | full nested Section A |
| `POST` | `/applications` | intake; **400** if `consent.data_processing_consent` is false |

## Seed demo dossiers

```bash
# from services/application-svc — uses DIRECT_URL, idempotent by CCCD
python scripts/seed_dossiers.py
```

Seeds 7 applications: 3 wow-flow demos (Bé Hoa / Trần Vui / Huyền Trần) + 4 CCCD cards
in `seed/dossiers.py`. Skip if `applicant.id_number` already exists.
