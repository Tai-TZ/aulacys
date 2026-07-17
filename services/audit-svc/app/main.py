"""audit-svc — the immutable decision ledger as an independent microservice.

The orchestrator POSTs a decision here (ideally via a `DecisionRecorded` event, so a
slow ledger never blocks the user response). Append-only + hash chain; a dead audit
service must not break the decision path (the caller treats the write as best-effort).
"""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from app import db

app = FastAPI(title="audit-svc", version="0.1.0")


class Violation(BaseModel):
    rule_id: str
    rule_version: str
    effective_from: str
    legal_basis: str
    metric_name: str
    metric_value: float
    threshold: float | None = None
    is_blocking: bool = False


class RecordRequest(BaseModel):
    application_id: str
    product: str
    lane: int
    outcome: str
    veto_fired: bool
    replan_count: int
    as_of: str
    signed_by: str
    violations: list[Violation] = []


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", **db.verify_chain()}


@app.post("/records")
def create_record(req: RecordRequest) -> dict:
    return db.append_record(
        req.model_dump(exclude={"violations"}),
        [v.model_dump() for v in req.violations],
    )


@app.get("/records/{application_id}")
def get_records(application_id: str) -> dict:
    return {"application_id": application_id, "records": db.records_for(application_id)}


@app.get("/verify")
def verify() -> dict:
    return db.verify_chain()
