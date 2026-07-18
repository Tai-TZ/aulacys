"""LOS tickets — Postgres only."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.engine import get_engine
from app.db.models import LoanTicket, TicketHistory


def init_db() -> None:
    Base.metadata.create_all(get_engine())


def _truncate_all() -> None:
    engine = get_engine()
    with Session(engine) as session:
        session.execute(text("DELETE FROM ticket_history"))
        session.execute(text("DELETE FROM loan_ticket"))
        session.commit()


def upsert_ticket(
    application_id: str,
    status: str,
    summary: str,
    product: str | None,
    *,
    changed_by: str = "system",
) -> dict[str, Any]:
    engine = get_engine()
    ticket_id = f"DEMO-{application_id.upper()}"
    now = datetime.now(timezone.utc)

    with Session(engine) as session:
        existing = session.get(LoanTicket, ticket_id)
        old_status = existing.status if existing else None
        created_at = existing.created_at if existing else now

        if existing:
            existing.status = status
            existing.summary = summary
            existing.product = product
            existing.updated_at = now
        else:
            session.add(
                LoanTicket(
                    ticket_id=ticket_id,
                    application_id=application_id,
                    status=status,
                    product=product,
                    summary=summary,
                    assigned_to=None,
                    created_at=created_at,
                    updated_at=now,
                )
            )

        if old_status != status:
            session.add(
                TicketHistory(
                    id=uuid.uuid4(),
                    ticket_id=ticket_id,
                    old_status=old_status,
                    new_status=status,
                    changed_at=now,
                    changed_by=changed_by,
                )
            )
        session.commit()

    return {
        "ticket_id": ticket_id,
        "application_id": application_id,
        "status": status,
        "summary": summary,
        "product": product,
        "written_at": now.isoformat(),
        "source": "los-svc",
    }


def tickets_for(application_id: str) -> list[dict[str, Any]]:
    with Session(get_engine()) as session:
        rows = session.scalars(select(LoanTicket).where(LoanTicket.application_id == application_id)).all()
        return [
            {
                "ticket_id": r.ticket_id,
                "application_id": r.application_id,
                "status": r.status,
                "product": r.product,
                "summary": r.summary,
                "assigned_to": r.assigned_to,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]


def history_for(ticket_id: str) -> list[dict[str, Any]]:
    with Session(get_engine()) as session:
        rows = session.scalars(
            select(TicketHistory)
            .where(TicketHistory.ticket_id == ticket_id)
            .order_by(TicketHistory.changed_at)
        ).all()
        return [
            {
                "id": str(r.id),
                "ticket_id": r.ticket_id,
                "old_status": r.old_status,
                "new_status": r.new_status,
                "changed_at": r.changed_at.isoformat() if r.changed_at else None,
                "changed_by": r.changed_by,
            }
            for r in rows
        ]
