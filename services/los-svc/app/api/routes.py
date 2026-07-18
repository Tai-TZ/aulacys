"""HTTP layer for los-svc."""

from __future__ import annotations

from fastapi import APIRouter

from app.db.engine import ping
from app.schemas.ticket import TicketRequest
from app.services import los as los_service

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "backend": "postgres"}


@router.get("/ready")
def ready() -> dict:
    ok = ping()
    return {"status": "ready" if ok else "not_ready", "db": ok}


@router.post("/tickets")
def create_ticket(req: TicketRequest) -> dict:
    return los_service.write_ticket(req.application_id, req.status, req.summary, req.product)


@router.get("/tickets/{application_id}")
def get_tickets(application_id: str) -> dict:
    return {
        "application_id": application_id,
        "tickets": los_service.list_tickets(application_id),
    }


@router.get("/tickets/{application_id}/history")
def get_history(application_id: str) -> dict:
    tickets = los_service.list_tickets(application_id)
    if not tickets:
        return {"application_id": application_id, "history": []}
    ticket_id = tickets[0]["ticket_id"]
    return {
        "application_id": application_id,
        "ticket_id": ticket_id,
        "history": los_service.ticket_history(ticket_id),
    }
