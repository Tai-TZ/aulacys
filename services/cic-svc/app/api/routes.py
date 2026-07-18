from fastapi import APIRouter, HTTPException

from app.schemas.cic import LookupRequest, LookupResponse
from app.services import cic as cic_service

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "seeded_cccds": cic_service.seeded_cccds()}


@router.post("/lookup", response_model=LookupResponse)
def lookup(req: LookupRequest) -> dict:
    result = cic_service.lookup(req.cccd, consent_granted=req.consent_granted)
    if result.get("error") == "consent_required":
        raise HTTPException(status_code=403, detail=result["detail"])
    return result
