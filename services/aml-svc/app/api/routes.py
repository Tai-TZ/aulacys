from fastapi import APIRouter
from app.schemas.aml import RelatedPartyRequest, ScreenRequest
from app.services import aml as aml_service

router = APIRouter()

@router.get("/health")
def health() -> dict:
    return aml_service.health_payload()

@router.post("/screen")
def screen(req: ScreenRequest) -> dict:
    return aml_service.screen(req.sanctions_match_count, req.pep_match_count, req.customer_name)

@router.post("/related-party")
def related_party(req: RelatedPartyRequest) -> dict:
    return aml_service.related_party(req.exposure_ratio_related_group)
