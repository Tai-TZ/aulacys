"""Request/response models for LOS tickets."""

from __future__ import annotations

from pydantic import BaseModel


class TicketRequest(BaseModel):
    application_id: str
    status: str
    summary: str
    product: str | None = None


class TicketResponse(BaseModel):
    ticket_id: str
    application_id: str
    status: str
    summary: str
    product: str | None = None
    written_at: str
    source: str = "los-svc"
