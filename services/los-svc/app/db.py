"""los-svc storage — loan ticket system-of-record (SQLite).

A real Loan Origination System is the bank's book of record for a loan application.
Here it is a small owned store; the monolith's workflow tool writes a ticket here
instead of returning a local dict. One ticket per application (upsert on ticket_id).
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(os.getenv("LOS_DB", "los.db"))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS loan_ticket (
    ticket_id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    status TEXT NOT NULL,
    product TEXT,
    summary TEXT NOT NULL,
    assigned_to TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_lt_app ON loan_ticket(application_id);
CREATE INDEX IF NOT EXISTS ix_lt_status ON loan_ticket(status);
"""


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.executescript(_SCHEMA)


def upsert_ticket(application_id: str, status: str, summary: str, product: str | None) -> dict[str, Any]:
    ticket_id = f"DEMO-{application_id.upper()}"
    now = datetime.now(timezone.utc).isoformat()
    with _conn() as conn:
        existing = conn.execute("SELECT created_at FROM loan_ticket WHERE ticket_id=?", (ticket_id,)).fetchone()
        created_at = existing["created_at"] if existing else now
        conn.execute(
            "INSERT INTO loan_ticket (ticket_id, application_id, status, product, summary, assigned_to, created_at, updated_at) "
            "VALUES (?,?,?,?,?,?,?,?) "
            "ON CONFLICT(ticket_id) DO UPDATE SET status=excluded.status, summary=excluded.summary, "
            "product=excluded.product, updated_at=excluded.updated_at",
            (ticket_id, application_id, status, product, summary, None, created_at, now),
        )
    return {
        "ticket_id": ticket_id,
        "application_id": application_id,
        "status": status,
        "summary": summary,
        "product": product,
        "written_at": now,
        "source": "los-svc",
    }


def tickets_for(application_id: str) -> list[dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM loan_ticket WHERE application_id=?", (application_id,)).fetchall()
        return [dict(r) for r in rows]
