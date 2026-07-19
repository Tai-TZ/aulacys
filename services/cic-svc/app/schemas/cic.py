from pydantic import BaseModel, Field


class LookupRequest(BaseModel):
    """Mock CIC inquiry — CCCD + customer consent (BR-03 / NĐ 13/2023)."""

    cccd: str = Field(..., min_length=12, max_length=12, pattern=r"^\d{12}$")
    consent_granted: bool = Field(
        ...,
        description="Must be true before CCCD is sent to CIC (CIC_INQUIRY consent).",
    )


class OverdueHistory(BaseModel):
    """Lịch sử quá hạn — số lần và số ngày."""

    count: int = Field(..., ge=0, description="Số lần quá hạn")
    max_days: int = Field(..., ge=0, description="Số ngày quá hạn tối đa")
    amount_vnd: int = Field(0, ge=0, description="Số tiền quá hạn (VND)")


class ScoreBreakdown(BaseModel):
    """Scorecard internals for demo / audit (not a real CIC field dump)."""

    scorecard_version: str
    pd: float = Field(..., ge=0.0, le=1.0, description="Probability of default")
    linear_score: float = Field(..., ge=0.0, le=1.0)
    components: dict[str, float]
    weights: dict[str, float]


class LookupResponse(BaseModel):
    status: str
    cccd: str
    customer_id: str | None = Field(None, description="Liên kết khách hàng (KYC)")
    full_name: str
    debt_group: int = Field(..., ge=1, le=5, description="Nhóm nợ (1-5)")
    cic_group: int = Field(..., ge=1, le=5, description="Alias of debt_group (compat)")
    classification: str
    score: int = Field(..., ge=403, le=706, description="CIC score scale [403, 706]")
    pd: float = Field(..., ge=0.0, le=1.0)
    has_bad_debt: bool
    outstanding_debt: int = Field(..., ge=0, description="Dư nợ hiện tại tại các TCTD khác (VND)")
    number_of_institutions: int = Field(..., ge=0, description="Số tổ chức tín dụng đang vay")
    institutions: list[str] = Field(default_factory=list, description="Danh sách TCTD (giả lập)")
    overdue_history: OverdueHistory
    num_active_loans: int
    total_outstanding_vnd: int
    monthly_debt_obligation_vnd: int | None = None
    credit_limit_total_vnd: int
    max_overdue_days: int
    overdue_amount_vnd: int
    credit_history_months: int
    credit_types: list[str]
    credit_types_vi: list[str] = Field(default_factory=list)
    inquiries_last_6m: int
    consent_granted: bool
    score_breakdown: ScoreBreakdown
    source: str
    dataset_version: str
    evidence_id: str
    record_found: bool
    inputs: dict
    computed_at: str
