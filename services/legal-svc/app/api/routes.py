from fastapi import APIRouter

from app.schemas.legal import CheckRequest, CheckResponse
from app.services import legal as legal_service

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return legal_service.health_payload()


@router.post("/check", response_model=CheckResponse)
def check(req: CheckRequest) -> dict:
    return legal_service.check(req.cccd, req.full_name)
