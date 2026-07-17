"""policy-svc — Policy Decision Point as an independent microservice.

The monolith's Compliance agent calls POST /evaluate over HTTP instead of
importing loader.py. Stateless, deterministic, no LLM. This is the cleanest seam
in the system (a pure function over versioned data) and the first extraction.
"""

from __future__ import annotations

from datetime import date

from fastapi import FastAPI
from pydantic import BaseModel

from app.policy import PolicyViolation, evaluate, unverified_rules

app = FastAPI(title="policy-svc", version="0.1.0")


class EvaluateRequest(BaseModel):
    metrics: dict[str, float]
    as_of: date | None = None


class EvaluateResponse(BaseModel):
    violations: list[PolicyViolation]
    veto: bool
    rule_ids: list[str]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "unverified_rules": [r.id for r in unverified_rules()]}


@app.post("/evaluate", response_model=EvaluateResponse)
def do_evaluate(req: EvaluateRequest) -> EvaluateResponse:
    violations = evaluate(req.metrics, as_of=req.as_of)
    return EvaluateResponse(
        violations=violations,
        veto=any(v.is_blocking for v in violations),
        rule_ids=[v.rule_id for v in violations],
    )
