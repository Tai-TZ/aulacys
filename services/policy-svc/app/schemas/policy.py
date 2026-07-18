"""Policy API schemas."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel

from app.services.engine import PolicyViolation


class EvaluateRequest(BaseModel):
    metrics: dict[str, float]
    as_of: date | None = None


class EvaluateResponse(BaseModel):
    violations: list[PolicyViolation]
    veto: bool
    rule_ids: list[str]


__all__ = ["EvaluateRequest", "EvaluateResponse", "PolicyViolation"]
