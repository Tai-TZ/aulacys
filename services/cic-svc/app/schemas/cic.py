from pydantic import BaseModel, Field


class LookupRequest(BaseModel):
    """Mock CIC inquiry — CCCD + customer consent (BR-03 / NĐ 13/2023)."""

    cccd: str = Field(..., min_length=12, max_length=12, pattern=r"^\d{12}$")
    consent_granted: bool = Field(
        ...,
        description="Must be true before CCCD is sent to CIC (CIC_INQUIRY consent).",
    )


class ScoreBreakdown(BaseModel):
    """Scorecard internals for demo / audit (not a real CIC field dump)."""

    scorecard_version: str
    pd: float = Field(..., ge=0.0, le=1.0, description="Probability of default")
    linear_score: float = Field(..., ge=0.0, le=1.0)
    components: dict[str, float]
    weights: dict[str, float]


class LookupResponse(BaseModel):
    cccd: str
    full_name: str
    cic_group: int = Field(..., ge=1, le=5)
    classification: str
    score: int = Field(..., ge=403, le=706, description="CIC score scale [403, 706]")
    pd: float = Field(..., ge=0.0, le=1.0)
    has_bad_debt: bool
    num_active_loans: int
    total_outstanding_vnd: int
    credit_limit_total_vnd: int
    max_overdue_days: int
    overdue_amount_vnd: int
    credit_history_months: int
    credit_types: list[str]
    inquiries_last_6m: int
    consent_granted: bool
    score_breakdown: ScoreBreakdown
    source: str
    inputs: dict
    computed_at: str
