#!/usr/bin/env python3
"""Bootstrap a fresh Supabase for the DB-owning services.

Idempotent. Does, in order:
  1. CREATE SCHEMA audit / los / application / orchestrator
  2. alembic upgrade head for DB-owning services
  3. verify: each schema has its expected tables

Reads each service's DIRECT_URL (session pooler :5432) from its .env. Run once against a
new Supabase project; safe to re-run.

    python services/db/bootstrap.py            # bootstrap + verify
    python services/db/bootstrap.py --verify   # verify only

Requires: psycopg (already in audit-svc/los-svc requirements).
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg

ROOT = Path(__file__).resolve().parents[2]
SCHEMAS = ["audit", "los", "application", "orchestrator"]
# service dir -> (schema, expected tables)
DB_SERVICES = {
    "services/orchestrator-svc": (
        "orchestrator",
        {"orchestrator_run", "orchestrator_node_run", "orchestrator_event"},
    ),
    "services/audit-svc": ("audit", {"audit_record", "audit_violation"}),
    "services/los-svc": ("los", {"loan_ticket", "ticket_history"}),
    "services/application-svc": (
        "application",
        {
            "loan_application",
            "applicant",
            "applicant_phone",
            "applicant_address",
            "employment",
            "reference_person",
            "spouse",
            "financial_capacity",
            "consent",
            "loan_purpose",
            "purpose_goods",
            "application_document",
            "disbursement",
            "sales_info",
        },
    ),
}


def _read_env(service_dir: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    f = service_dir / ".env"
    if not f.is_file():
        return env
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def _admin_url() -> str:
    """A session-pooler URL to run CREATE SCHEMA (any DB-owning service's DIRECT_URL)."""
    for d in DB_SERVICES:
        env = _read_env(ROOT / d)
        url = env.get("DIRECT_URL") or env.get("DATABASE_URL")
        if url and url.startswith("postgres"):
            # psycopg wants no +driver and no unknown query opts stripped is fine
            return url.replace("postgresql+psycopg://", "postgresql://")
    sys.exit("No DIRECT_URL/DATABASE_URL found in audit-svc/los-svc .env")


def _url_for_schema(url: str, schema: str) -> str:
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query["options"] = f"-csearch_path={schema}"
    query.pop("pgbouncer", None)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), ""))


def _migration_env(service_dir: Path, schema: str) -> dict[str, str]:
    env = _read_env(service_dir)
    base_url = env.get("DIRECT_URL") or env.get("DATABASE_URL") or _admin_url()
    schema_url = _url_for_schema(base_url, schema)
    return {
        "DATABASE_URL": env.get("DATABASE_URL") or schema_url,
        "DIRECT_URL": env.get("DIRECT_URL") or schema_url,
        "DB_SCHEMA": env.get("DB_SCHEMA") or schema,
    }


def create_schemas() -> None:
    url = _admin_url()
    print("== 1. CREATE SCHEMA ==")
    with psycopg.connect(url, autocommit=True) as conn:
        for s in SCHEMAS:
            conn.execute(f"CREATE SCHEMA IF NOT EXISTS {s};")
            print(f"   schema {s} ready")


def migrate() -> None:
    print("== 2. alembic upgrade head ==")
    for d, (schema, _expected) in DB_SERVICES.items():
        print(f"   {d} ...")
        env = {**os.environ, **_migration_env(ROOT / d, schema)}
        r = subprocess.run(
            ["alembic", "upgrade", "head"], cwd=ROOT / d, env=env, text=True
        )
        if r.returncode != 0:
            sys.exit(f"alembic failed in {d}")
        repair_schema_snapshot(ROOT / d, schema, _expected)


def _found_tables(conn: psycopg.Connection, schema: str) -> set[str]:
    rows = conn.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = %s",
        (schema,),
    ).fetchall()
    return {r[0] for r in rows}


def repair_schema_snapshot(service_dir: Path, schema: str, expected: set[str]) -> None:
    """Repair old DBs where Alembic version exists but tables landed in `public`."""
    snapshot = service_dir / "schema.sql"
    if not snapshot.is_file():
        return
    with psycopg.connect(_admin_url(), autocommit=True) as conn:
        missing = expected - _found_tables(conn, schema)
        if not missing:
            return
        print(
            f"      repairing schema {schema} from schema.sql; missing={sorted(missing)}"
        )
        conn.execute(f'SET search_path TO "{schema}"')
        conn.execute(snapshot.read_text(encoding="utf-8"))


def verify() -> bool:
    print("== 3. verify ==")
    url = _admin_url()
    ok = True
    with psycopg.connect(url, autocommit=True) as conn:
        for d, (schema, expected) in DB_SERVICES.items():
            found = _found_tables(conn, schema)
            missing = expected - found
            status = "OK" if not missing else f"MISSING {missing}"
            print(f"   schema {schema}: {sorted(found & expected)}  [{status}]")
            ok = ok and not missing
    print("   RESULT:", "ready" if ok else "INCOMPLETE")
    return ok


def main() -> None:
    if "--verify" in sys.argv:
        sys.exit(0 if verify() else 1)
    create_schemas()
    migrate()
    sys.exit(0 if verify() else 1)


if __name__ == "__main__":
    main()
