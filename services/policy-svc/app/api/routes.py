"""HTTP layer for policy-svc."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.policy import EvaluateRequest, EvaluateResponse
from app.services import engine

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "unverified_rules": [r.id for r in engine.unverified_rules()]}


@router.post("/evaluate", response_model=EvaluateResponse)
def do_evaluate(req: EvaluateRequest) -> EvaluateResponse:
    violations = engine.evaluate(req.metrics, as_of=req.as_of)
    return EvaluateResponse(
        violations=violations,
        veto=any(v.is_blocking for v in violations),
        rule_ids=[v.rule_id for v in violations],
    )
