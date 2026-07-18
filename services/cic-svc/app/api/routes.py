from fastapi import APIRouter
from app.schemas.cic import LookupRequest
from app.services import cic as cic_service

router = APIRouter()

@router.get("/health")
def health() -> dict:
    return {"status": "ok", "seeded_customers": cic_service.seeded_customers()}

@router.post("/lookup")
def lookup(req: LookupRequest) -> dict:
    return cic_service.lookup(req.customer_name)
