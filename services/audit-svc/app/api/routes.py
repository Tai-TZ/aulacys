"""HTTP layer — parse request, call service, shape response."""

from __future__ import annotations

from fastapi import APIRouter

from app.db.engine import ping
from app.schemas.audit import RecordRequest
from app.services import audit as audit_service

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "backend": "postgres", **audit_service.chain_status()}


@router.get("/ready")
def ready() -> dict:
    ok = ping()
    return {"status": "ready" if ok else "not_ready", "db": ok}


@router.post("/records")
def create_record(req: RecordRequest) -> dict:
    return audit_service.record_decision(
        req.model_dump(exclude={"violations"}),
        [v.model_dump() for v in req.violations],
    )


@router.get("/records/{application_id}")
def get_records(application_id: str) -> dict:
    return {
        "application_id": application_id,
        "records": audit_service.list_records(application_id),
    }


@router.get("/verify")
def verify() -> dict:
    return audit_service.chain_status()
