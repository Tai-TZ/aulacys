from pydantic import BaseModel

class ScreenRequest(BaseModel):
    sanctions_match_count: int = 0
    pep_match_count: int = 0
    customer_name: str | None = None

class RelatedPartyRequest(BaseModel):
    exposure_ratio_related_group: float = 0
