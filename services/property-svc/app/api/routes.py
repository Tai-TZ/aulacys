from fastapi import APIRouter
from app.schemas.property import DocChecklistRequest, LandRegistryRequest, ValuationRequest
from app.services import property as property_service

router = APIRouter()

@router.get("/health")
def health() -> dict:
    return property_service.health_payload()

@router.post("/valuation")
def valuation(req: ValuationRequest) -> dict:
    return property_service.valuation(req.collateral_value, req.parcel_id)

@router.post("/land-registry")
def land_registry(req: LandRegistryRequest) -> dict:
    return property_service.land_registry(req.has_dispute, req.zoning_flag, req.parcel_id)

@router.post("/doc-checklist")
def doc_checklist(req: DocChecklistRequest) -> dict:
    return property_service.doc_checklist(req.required, req.provided)
