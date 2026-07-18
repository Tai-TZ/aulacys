"""Request/response models for the audit ledger API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class Violation(BaseModel):
    rule_id: str
    rule_version: str
    effective_from: str
    legal_basis: str
    metric_name: str
    metric_value: float
    threshold: float | None = None
    is_blocking: bool = False


class RecordRequest(BaseModel):
    application_id: str
    product: str
    lane: int
    outcome: str
    veto_fired: bool
    replan_count: int
    as_of: str
    signed_by: str
    violations: list[Violation] = Field(default_factory=list)


class RecordResponse(BaseModel):
    record_id: str
    seq: int
    content_hash: str
    prev_hash: str | None = None
    decided_at: str
