# Supabase — schema-per-service (1 project, free)

> One Supabase project, one **schema per DB-owning service** (`audit`, `los`,
> `orchestrator`). Logical database-per-service — no shared tables, no cross-service FK —
> on the free tier. Graduate to project-per-service (paid) only when a service needs
> independent scaling/backup. See `DEPLOY-GCP.md` for the surrounding topology.

## 1. Why this (vs project-per-service)

| | Schema-per-service | Project-per-service |
|---|---|---|
| Supabase projects | **1** (free) | N (free ≈ 2/org, then paid) |
| Isolation | logical (separate schemas) | physical (separate DBs) |
| Rule held | ✅ no shared tables, no cross-FK | ✅ |
| Start here | ✅ | later, when scaling demands |

Only **audit + los** need a schema now; **orchestrator** (`loan_run`) later. The other 7
services are stateless/seed → **no schema, no DB**.

## 2. One-time setup (Supabase SQL editor)

```sql
-- schemas = one per DB-owning service
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS los;
CREATE SCHEMA IF NOT EXISTS orchestrator;
```

That is enough for **logical** separation (each service only creates/queries tables in its
own schema via `search_path`, below). For **hard** isolation add a role per service (§6).

## 3. Connection — pin each service to its schema

The trick: put `search_path` in the connection string. Then every `CREATE TABLE`, query,
and the Alembic version table land in that schema automatically — **no model changes, no
qualifying table names**.

```
# Connect to Postgres via the shared transaction-mode pooler (IPv4-only)
DATABASE_URL="postgresql://postgres.[keydb]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&options=-csearch_path%3Daudit"

# Connect to Postgres via the shared session-mode pooler (used for migrations)
DIRECT_URL="postgresql://postgres.[keydb]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?options=-csearch_path%3Daudit"
```
`%3D` = `=`, `%20` = space. So `options=-csearch_path%3Daudit` means `-c search_path=audit`.

Per service, only the schema in `search_path` changes:

| Service | search_path |
|---------|-------------|
| audit-svc | `audit` |
| los-svc | `los` |
| application-svc | `application` |
| orchestrator-svc | `orchestrator` |

## 4. App code — nothing schema-specific needed

Because `search_path` is set on the connection, the SQLAlchemy engine from
`POSTGRES-CONNECTION.md` works unchanged:
```python
create_engine(DATABASE_URL.replace("postgresql://","postgresql+psycopg://"), pool_pre_ping=True)
```
`CREATE TABLE IF NOT EXISTS audit_record` → created in the `audit` schema. Queries resolve
there too. **Postgres is required** (`DATABASE_URL`); there is no SQLite fallback.

## 5. Migrations (Alembic per service, into its schema)

Each service owns its Alembic; run against `DIRECT_URL` (which already carries the schema):
```bash
# in services/audit-svc, DIRECT_URL points at ...:5432/...?options=-csearch_path%3Daudit
alembic upgrade head
```
In `migrations/env.py`, pin the version table to the schema so services never collide:
```python
context.configure(
    connection=connection,
    target_metadata=target_metadata,
    version_table_schema="audit",   # los-svc uses "los", etc.
    include_schemas=True,
)
```
Now `alembic_version` lives in each service's schema — no cross-service migration state.

## 6. Hard isolation (optional upgrade)

Logical (search_path) is enough for the "no shared tables" rule. For real access control,
add a role per service so a service **cannot** read another's schema:
```sql
CREATE ROLE audit_svc LOGIN PASSWORD '<pwd>';
GRANT USAGE, CREATE ON SCHEMA audit TO audit_svc;
ALTER ROLE audit_svc SET search_path = audit;
-- do NOT grant audit_svc any rights on los / orchestrator schemas
```
Then connect as `audit_svc` instead of `postgres`. (On the Supabase pooler the username
becomes `audit_svc.<ref>` — verify the exact format in your project's connection settings.)

## 7. Secrets (GCP Secret Manager)

One secret pair per DB-owning service; inject into that Cloud Run service only:
```bash
gcloud run deploy audit-svc --update-secrets \
  DATABASE_URL=audit-database-url:latest,DIRECT_URL=audit-direct-url:latest
```
Never bake connection strings into images or git.

## 8. Verify

```bash
# migrate into the schema
alembic upgrade head
# runtime
curl -s <audit-svc-url>/health     # {status, intact:true, records}
curl -s <audit-svc-url>/verify     # intact:true
# in Supabase SQL editor: tables exist ONLY in their schema
SELECT table_schema, table_name FROM information_schema.tables
WHERE table_schema IN ('audit','los','orchestrator') ORDER BY 1,2;
```

## 9. Graduating to project-per-service (later)

When audit or los needs independent scaling/backup: create a dedicated Supabase project
for it, point its `DATABASE_URL`/`DIRECT_URL` at the new project, drop the `search_path`
option (it owns the whole `postgres` DB now), re-run its Alembic. **Only that service's env
changes** — no code, no other service touched. That is the payoff of database-per-service.

## Summary
- 1 Supabase project, schemas `audit` / `los` / `orchestrator`.
- Isolation via `search_path` in the connection string — zero model/code changes.
- Per-service Alembic with `version_table_schema` = its schema.
- SQLite fallback intact for local/tests.
- Move a service to its own project later by swapping only its two URLs.
