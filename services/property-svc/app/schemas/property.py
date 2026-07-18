from pydantic import BaseModel

class ValuationRequest(BaseModel):
    collateral_value: float
    parcel_id: str | None = None

class LandRegistryRequest(BaseModel):
    has_dispute: bool = False
    zoning_flag: bool = False
    parcel_id: str | None = None

class DocChecklistRequest(BaseModel):
    required: list[str]
    provided: list[str]
