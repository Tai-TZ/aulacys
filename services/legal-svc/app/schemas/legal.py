from typing import Literal

from pydantic import BaseModel, Field


class CheckRequest(BaseModel):
    """Legal / police blacklist inquiry — CCCD primary, name optional for soft match."""

    cccd: str = Field(..., min_length=12, max_length=12, pattern=r"^\d{12}$")
    full_name: str | None = Field(
        default=None,
        max_length=200,
        description="Optional; used for name-only POSSIBLE_HIT when CCCD is clean.",
    )


class LegalMatch(BaseModel):
    list: Literal["police_wanted", "court_judgment", "bank_internal"]
    code: str
    severity: Literal["blocking", "review"]
    detail: str
    match_type: Literal["cccd", "name"]


class CheckResponse(BaseModel):
    cccd: str
    full_name: str
    result: Literal["CLEAR", "POSSIBLE_HIT", "HIT"]
    is_blacklisted: bool = Field(..., description="True when any blocking HIT on CCCD")
    blocking: bool
    matches: list[LegalMatch]
    source: str
    inputs: dict
    computed_at: str
