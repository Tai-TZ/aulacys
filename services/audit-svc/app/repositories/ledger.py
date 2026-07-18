"""Audit ledger — Postgres only (DATABASE_URL required)."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.engine import get_engine
from app.db.models import AuditRecord, AuditViolation
from app.repositories.hashing import canonicalize_violations, content_hash


def init_db() -> None:
    """Ensure schema exists. Prefer `alembic upgrade head` in prod."""
    engine = get_engine()
    Base.metadata.create_all(engine)


def _truncate_all() -> None:
    """Test helper — wipe ledger tables."""
    engine = get_engine()
    with Session(engine) as session:
        session.execute(text("DELETE FROM audit_violation"))
        session.execute(text("DELETE FROM audit_record"))
        session.commit()


def append_record(rec: dict[str, Any], violations: list[dict[str, Any]]) -> dict[str, Any]:
    engine = get_engine()
    record_id = uuid.uuid4()
    decided_at = datetime.now(timezone.utc).isoformat()
    as_of = date.fromisoformat(str(rec["as_of"])[:10])
    canon_vios = canonicalize_violations(violations)

    with Session(engine) as session:
        max_seq = session.scalar(select(func.coalesce(func.max(AuditRecord.seq), 0))) or 0
        last = session.scalar(select(AuditRecord).order_by(AuditRecord.seq.desc()).limit(1))
        prev_hash = last.content_hash if last else None
        seq = int(max_seq) + 1

        core = {
            "application_id": rec["application_id"],
            "product": rec["product"],
            "lane": rec["lane"],
            "outcome": rec["outcome"],
            "veto_fired": bool(rec["veto_fired"]),
            "replan_count": rec["replan_count"],
            "as_of": as_of.isoformat(),
            "signed_by": rec["signed_by"],
            "decided_at": decided_at,
            "seq": seq,
            "violations": canon_vios,
        }
        digest = content_hash(core, prev_hash)

        session.add(
            AuditRecord(
                id=record_id,
                application_id=rec["application_id"],
                product=rec["product"],
                lane=rec["lane"],
                outcome=rec["outcome"],
                veto_fired=bool(rec["veto_fired"]),
                replan_count=rec["replan_count"],
                as_of=as_of,
                signed_by=rec["signed_by"],
                decided_at=decided_at,
                decided_at_ts=datetime.fromisoformat(decided_at),
                seq=seq,
                content_hash=digest,
                prev_hash=prev_hash,
            )
        )
        for v in violations:
            session.add(
                AuditViolation(
                    id=uuid.uuid4(),
                    record_id=record_id,
                    rule_id=v["rule_id"],
                    rule_version=v["rule_version"],
                    effective_from=date.fromisoformat(str(v["effective_from"])[:10]),
                    legal_basis=v["legal_basis"],
                    metric_name=v["metric_name"],
                    metric_value=float(v["metric_value"]),
                    threshold=(float(v["threshold"]) if v.get("threshold") is not None else None),
                    is_blocking=bool(v["is_blocking"]),
                )
            )
        session.commit()

    return {
        "record_id": str(record_id),
        "seq": seq,
        "content_hash": digest,
        "prev_hash": prev_hash,
        "decided_at": decided_at,
    }


def records_for(application_id: str) -> list[dict[str, Any]]:
    engine = get_engine()
    with Session(engine) as session:
        rows = session.scalars(
            select(AuditRecord).where(AuditRecord.application_id == application_id).order_by(AuditRecord.seq)
        ).all()
        out: list[dict[str, Any]] = []
        for r in rows:
            vios = session.scalars(select(AuditViolation).where(AuditViolation.record_id == r.id)).all()
            out.append(
                {
                    "id": str(r.id),
                    "application_id": r.application_id,
                    "product": r.product,
                    "lane": r.lane,
                    "outcome": r.outcome,
                    "veto_fired": int(r.veto_fired),
                    "replan_count": r.replan_count,
                    "as_of": r.as_of.isoformat() if hasattr(r.as_of, "isoformat") else r.as_of,
                    "signed_by": r.signed_by,
                    "decided_at": r.decided_at,
                    "seq": r.seq,
                    "content_hash": r.content_hash,
                    "prev_hash": r.prev_hash,
                    "violations": [
                        {
                            "rule_id": v.rule_id,
                            "rule_version": v.rule_version,
                            "effective_from": v.effective_from.isoformat()
                            if hasattr(v.effective_from, "isoformat")
                            else v.effective_from,
                            "legal_basis": v.legal_basis,
                            "metric_name": v.metric_name,
                            "metric_value": v.metric_value,
                            "threshold": v.threshold,
                            "is_blocking": bool(v.is_blocking),
                        }
                        for v in vios
                    ],
                }
            )
        return out


def verify_chain() -> dict[str, Any]:
    engine = get_engine()
    with Session(engine) as session:
        rows = session.scalars(select(AuditRecord).order_by(AuditRecord.seq)).all()
        prev: str | None = None
        for r in rows:
            vios = session.scalars(select(AuditViolation).where(AuditViolation.record_id == r.id)).all()
            as_of = r.as_of.isoformat() if hasattr(r.as_of, "isoformat") else str(r.as_of)
            core = {
                "application_id": r.application_id,
                "product": r.product,
                "lane": r.lane,
                "outcome": r.outcome,
                "veto_fired": bool(r.veto_fired),
                "replan_count": r.replan_count,
                "as_of": as_of,
                "signed_by": r.signed_by,
                "decided_at": r.decided_at,
                "seq": r.seq,
                "violations": [
                    {
                        "rule_id": v.rule_id,
                        "rule_version": v.rule_version,
                        "effective_from": v.effective_from.isoformat()
                        if hasattr(v.effective_from, "isoformat")
                        else v.effective_from,
                        "legal_basis": v.legal_basis,
                        "metric_name": v.metric_name,
                        "metric_value": v.metric_value,
                        "threshold": v.threshold,
                        "is_blocking": bool(v.is_blocking),
                    }
                    for v in vios
                ],
            }
            if content_hash(core, prev) != r.content_hash:
                return {"intact": False, "broken_at_seq": r.seq}
            prev = r.content_hash
        return {"intact": True, "records": len(rows)}
