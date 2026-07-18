"""HTTP layer for application-svc."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db.engine import ping
from app.schemas.application import ApplicationCreateRequest
from app.services import application as app_service
from app.services.application import ConsentRequiredError

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "backend": "postgres"}


@router.get("/ready")
def ready() -> dict:
    ok = ping()
    return {"status": "ready" if ok else "not_ready", "db": ok}


@router.post("/applications")
def create_application(req: ApplicationCreateRequest) -> dict:
    try:
        return app_service.create_application(req)
    except ConsentRequiredError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/applications/{application_id}")
def get_application(application_id: str) -> dict:
    row = app_service.get_application(application_id)
    if row is None:
        raise HTTPException(status_code=404, detail="application not found")
    return row
