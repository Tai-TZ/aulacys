# Connecting Postgres to the services — implementation guide

> Concrete steps to move the DB-owning services (audit-svc, los-svc; orchestrator
> `loan_run` later) from SQLite to Postgres, **keeping the SQLite fallback** so the demo
> and tests still run with no Postgres. Design rationale: `DB-PER-SERVICE.md`.
> This is the "code from it" version — includes the gotchas that will bite otherwise.

## 1. Approach

- **One code path, two backends.** Use **SQLAlchemy Core** (not raw `sqlite3`, not the
  ORM). One engine, portable `text()` SQL → runs on SQLite **and** Postgres.
- **Engine chosen by env:** `DATABASE_URL` set (`postgresql://…`) ⇒ Postgres; unset ⇒
  SQLite file. Same functions, same tests, both paths.
- **Sync SQLAlchemy + `psycopg` (v3)** — these services are low-QPS; async is unneeded.
- **Database-per-service:** audit-svc → `audit_db`, los-svc → `los_db`. No shared tables.

## 2. Per-service changes (audit-svc = template)

### 2.1 `app/core/config.py`
```python
database_url: str = ""          # postgres when set; else SQLite fallback
audit_db: Path = Path("audit.db")
```

### 2.2 `app/repositories/ledger.py` — engine selection
```python
from functools import lru_cache
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

@lru_cache
def _engine() -> Engine:
    s = get_settings()
    if s.database_url.startswith("postgres"):
        url = s.database_url.replace("postgresql://", "postgresql+psycopg://") \
                            .replace("postgres://", "postgresql+psycopg://")
        return create_engine(url, pool_pre_ping=True)
    s.audit_db.parent.mkdir(parents=True, exist_ok=True)
    return create_engine(f"sqlite:///{s.audit_db}")

def _is_pg() -> bool:
    return get_settings().database_url.startswith("postgres")
```
- **Reads:** `with _engine().connect() as c: rows = c.execute(text(sql), params).mappings().all()`
- **Writes:** `with _engine().begin() as c: c.execute(text(sql), params)`  (begin() = commit)
- Replace every `?` placeholder with **named** params `:name` (portable across dialects).

### 2.3 `requirements.txt`
```
sqlalchemy>=2.0
psycopg[binary]>=3.1
```

## 3. ⚠️ Gotchas — get these wrong and the hash chain "breaks" on Postgres

1. **Use `DOUBLE PRECISION`, never `REAL`, for `metric_value`/`threshold`.**
   The hash is computed over `float(metric_value)` at append time and **re-read from the
   DB** at verify time. Postgres `REAL` is float4 → it rounds the value → the re-read
   differs → `verify_chain` falsely reports "tampered". `DOUBLE PRECISION` (float8) is
   exact. SQLite accepts `DOUBLE PRECISION` too (REAL affinity, 8-byte). Same schema both.

2. **The "last record" query must be portable.** The current
   `SELECT content_hash, COALESCE(MAX(seq),0) … ORDER BY seq DESC` mixes an aggregate with
   a non-grouped column — **SQLite allows it, Postgres errors** (needs GROUP BY). Replace with:
   ```sql
   SELECT content_hash, seq FROM audit_record ORDER BY seq DESC LIMIT 1
   ```
   then `prev_hash = row.content_hash`, `seq = (row.seq or 0) + 1`.

3. **Keep booleans as INTEGER (0/1) on both.** Don't switch to Postgres `BOOLEAN` — a type
   divergence changes the canonical shape and risks hash drift. Store `veto_fired`,
   `is_blocking` as `INTEGER`.

4. **Store timestamps/dates as TEXT (isoformat).** `decided_at`, `as_of` stay `TEXT` —
   avoids `timestamptz` vs SQLite-string divergence and keeps the hashed value identical.

5. **Immutability triggers = Postgres only.** After `CREATE TABLE`, when `_is_pg()`:
   ```sql
   CREATE OR REPLACE FUNCTION forbid_audit_mutation() RETURNS trigger AS $$
   BEGIN RAISE EXCEPTION 'audit rows are immutable (append-only)'; END;
   $$ LANGUAGE plpgsql;
   DROP TRIGGER IF EXISTS audit_record_immutable ON audit_record;
   CREATE TRIGGER audit_record_immutable BEFORE UPDATE OR DELETE ON audit_record
     FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();
   ```
   SQLite skips triggers; the hash chain is its tamper-evidence.

## 4. los-svc — same pattern, simpler

`upsert_ticket` already uses `INSERT … ON CONFLICT(ticket_id) DO UPDATE` — **that syntax
works on both SQLite and Postgres**, so only the engine selection + named params + config
`database_url` change. No hash gotchas (tickets are mutable by design).

## 5. Schema init — now vs production

- **Now (fastest):** keep `init_db()` doing `CREATE TABLE IF NOT EXISTS` on startup (portable
  on both). Add the PG triggers there when `_is_pg()`.
- **Production:** replace startup DDL with **Alembic per service** (`services/audit-svc/
  migrations/`), run `alembic upgrade head` as a migrate job before the service starts
  (`DB-PER-SERVICE.md` §4). One Alembic per service; never cross-service DDL.

## 6. Deploy — add Postgres to compose

```yaml
# docker-compose.yml (add)
  postgres:
    image: postgres:16
    environment: { POSTGRES_PASSWORD: devpass }
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./deploy/postgres-init:/docker-entrypoint-initdb.d
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
```

## 7. Verify (both backends must pass)

**SQLite (no DATABASE_URL) — unchanged behaviour:**
```bash
cd services/audit-svc && python -m pytest -q      # chain + tamper tests green
```
**Postgres (compose):**
```bash
docker compose up --build postgres audit-svc los-svc
curl -s localhost:8200/health     # {status, intact:true, records:N}
curl -s localhost:8200/verify     # intact:true
# tamper test: UPDATE a row in audit_db via psql -> /verify -> intact:false, broken_at_seq
```
Same endpoints, same result on both — that's the sign the conversion is correct.

## 8. Order of work

1. audit-svc: config + `ledger.py` (Core + §3 gotchas) + requirements. Verify SQLite green.
2. los-svc: same, simpler.
3. Add `postgres` + init + `DATABASE_URL` to compose. Verify Postgres path.
4. Later (prod): Alembic per service + migrate job; orchestrator `loan_run`.

> Do NOT give a DB to policy/cic/aml/property/income/gateway/worker — they are
> read-only/stateless. Only audit + los (+ orchestrator later) connect Postgres.
