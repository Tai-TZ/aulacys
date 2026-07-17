"""audit-svc storage — append-only ledger with a hash chain.

Self-contained SQLite so the service runs with zero external deps. The immutability
guarantee here is app-level (only INSERT + SELECT are exposed) plus a tamper-evident
hash chain. Production hardens this with the Postgres triggers in the monolith's
migration 0001 (BEGIN UPDATE/DELETE -> raise). A service owns its own store.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(os.getenv("AUDIT_DB", "audit.db"))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS audit_record (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    product TEXT NOT NULL,
    lane INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    veto_fired INTEGER NOT NULL,
    replan_count INTEGER NOT NULL,
    as_of TEXT NOT NULL,
    signed_by TEXT NOT NULL,
    decided_at TEXT NOT NULL,
    seq INTEGER,
    content_hash TEXT NOT NULL,
    prev_hash TEXT
);
CREATE TABLE IF NOT EXISTS audit_violation (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    rule_version TEXT NOT NULL,
    effective_from TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    threshold REAL,
    is_blocking INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_ar_app ON audit_record(application_id);
CREATE INDEX IF NOT EXISTS ix_av_rec ON audit_violation(record_id);
"""


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.executescript(_SCHEMA)


def _hash(core: dict[str, Any], prev_hash: str | None) -> str:
    payload = json.dumps(core, sort_keys=True, ensure_ascii=False) + (prev_hash or "")
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def append_record(rec: dict[str, Any], violations: list[dict[str, Any]]) -> dict[str, Any]:
    """Insert one decision + its violations. Chains onto the previous record."""
    record_id = str(uuid.uuid4())
    decided_at = datetime.now(timezone.utc).isoformat()
    with _conn() as conn:
        row = conn.execute(
            "SELECT content_hash, COALESCE(MAX(seq), 0) AS max_seq FROM audit_record "
            "ORDER BY seq DESC LIMIT 1"
        ).fetchone()
        prev_hash = row["content_hash"] if row and row["content_hash"] else None
        seq = (row["max_seq"] if row and row["max_seq"] is not None else 0) + 1

        # Canonical shape must match verify_chain() exactly, or the chain won't verify.
        canon_vios = [
            {
                "rule_id": v["rule_id"],
                "rule_version": v["rule_version"],
                "effective_from": v["effective_from"],
                "legal_basis": v["legal_basis"],
                "metric_name": v["metric_name"],
                "metric_value": float(v["metric_value"]),
                "threshold": (float(v["threshold"]) if v.get("threshold") is not None else None),
                "is_blocking": bool(v["is_blocking"]),
            }
            for v in violations
        ]
        core = {
            "application_id": rec["application_id"],
            "product": rec["product"],
            "lane": rec["lane"],
            "outcome": rec["outcome"],
            "veto_fired": bool(rec["veto_fired"]),
            "replan_count": rec["replan_count"],
            "as_of": rec["as_of"],
            "signed_by": rec["signed_by"],
            "decided_at": decided_at,
            "seq": seq,
            "violations": canon_vios,
        }
        content_hash = _hash(core, prev_hash)

        conn.execute(
            "INSERT INTO audit_record (id, application_id, product, lane, outcome, veto_fired, "
            "replan_count, as_of, signed_by, decided_at, seq, content_hash, prev_hash) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                record_id, rec["application_id"], rec["product"], rec["lane"], rec["outcome"],
                int(bool(rec["veto_fired"])), rec["replan_count"], rec["as_of"], rec["signed_by"],
                decided_at, seq, content_hash, prev_hash,
            ),
        )
        for v in violations:
            conn.execute(
                "INSERT INTO audit_violation (id, record_id, rule_id, rule_version, effective_from, "
                "legal_basis, metric_name, metric_value, threshold, is_blocking) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (
                    str(uuid.uuid4()), record_id, v["rule_id"], v["rule_version"], v["effective_from"],
                    v["legal_basis"], v["metric_name"], v["metric_value"], v.get("threshold"),
                    int(bool(v["is_blocking"])),
                ),
            )
    return {"record_id": record_id, "seq": seq, "content_hash": content_hash, "prev_hash": prev_hash, "decided_at": decided_at}


def records_for(application_id: str) -> list[dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM audit_record WHERE application_id=? ORDER BY seq", (application_id,)
        ).fetchall()
        out = []
        for r in rows:
            vios = conn.execute(
                "SELECT rule_id, rule_version, effective_from, legal_basis, metric_name, "
                "metric_value, threshold, is_blocking FROM audit_violation WHERE record_id=?",
                (r["id"],),
            ).fetchall()
            item = dict(r)
            item["violations"] = [dict(v) for v in vios]
            out.append(item)
        return out


def verify_chain() -> dict[str, Any]:
    """Walk the chain in seq order; recompute each hash. Any mismatch = tampered."""
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM audit_record ORDER BY seq").fetchall()
        prev_hash: str | None = None
        for r in rows:
            vios = conn.execute(
                "SELECT rule_id, rule_version, effective_from, legal_basis, metric_name, "
                "metric_value, threshold, is_blocking FROM audit_violation WHERE record_id=?",
                (r["id"],),
            ).fetchall()
            core = {
                "application_id": r["application_id"], "product": r["product"], "lane": r["lane"],
                "outcome": r["outcome"], "veto_fired": bool(r["veto_fired"]),
                "replan_count": r["replan_count"], "as_of": r["as_of"], "signed_by": r["signed_by"],
                "decided_at": r["decided_at"], "seq": r["seq"],
                "violations": [
                    {
                        "rule_id": v["rule_id"], "rule_version": v["rule_version"],
                        "effective_from": v["effective_from"], "legal_basis": v["legal_basis"],
                        "metric_name": v["metric_name"], "metric_value": v["metric_value"],
                        "threshold": v["threshold"], "is_blocking": bool(v["is_blocking"]),
                    }
                    for v in vios
                ],
            }
            if _hash(core, prev_hash) != r["content_hash"]:
                return {"intact": False, "broken_at_seq": r["seq"]}
            prev_hash = r["content_hash"]
        return {"intact": True, "records": len(rows)}
