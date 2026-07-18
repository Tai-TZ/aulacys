"""LOS business logic — ticket id rules; no FastAPI."""

from __future__ import annotations

from typing import Any

from app.repositories import tickets as repo

ALLOWED_STATUSES = frozenset(
    {"vetoed", "ready_for_human_approval", "stp_approved", "escalated"}
)


def init() -> None:
    repo.init_db()


def write_ticket(
    application_id: str,
    status: str,
    summary: str,
    product: str | None = None,
) -> dict[str, Any]:
    # Soft validation: unknown statuses still persist (demo-proof) but normalize strip.
    clean = status.strip() or "ready_for_human_approval"
    return repo.upsert_ticket(application_id, clean, summary, product)


def list_tickets(application_id: str) -> list[dict[str, Any]]:
    return repo.tickets_for(application_id)


def ticket_history(ticket_id: str) -> list[dict[str, Any]]:
    return repo.history_for(ticket_id)
