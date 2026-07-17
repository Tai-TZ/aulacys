"""los-svc — Loan Origination System (system of record) as its own service.

The monolith's workflow tool POSTs the approval ticket here. This is the "concrete
action" the brief emphasizes — a real write into a banking workflow system, not text.
"""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from app import db

app = FastAPI(title="los-svc", version="0.1.0")


class TicketRequest(BaseModel):
    application_id: str
    status: str
    summary: str
    product: str | None = None


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/tickets")
def create_ticket(req: TicketRequest) -> dict:
    return db.upsert_ticket(req.application_id, req.status, req.summary, req.product)


@app.get("/tickets/{application_id}")
def get_tickets(application_id: str) -> dict:
    return {"application_id": application_id, "tickets": db.tickets_for(application_id)}
