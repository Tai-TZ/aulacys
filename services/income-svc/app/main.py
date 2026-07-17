"""income-svc - mock payroll/open-banking statement verification service."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="income-svc", version="0.1.0")


class VerifyRequest(BaseModel):
    declared_monthly_income: float
    statement_monthly_income: float | None = None


class StatementParseRequest(BaseModel):
    monthly_income: float
    purpose_from_transactions: str | None = None


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/verify")
def verify(req: VerifyRequest) -> dict:
    if req.declared_monthly_income <= 0:
        return {"error": "declared_monthly_income must be positive"}

    verified = req.statement_monthly_income if req.statement_monthly_income is not None else req.declared_monthly_income
    if verified <= 0:
        return {"error": "statement_monthly_income must be positive when provided"}

    return {
        "verified_monthly_income": verified,
        "variance": round(verified - req.declared_monthly_income, 2),
        "source": "income-svc",
        "inputs": {
            "declared_monthly_income": req.declared_monthly_income,
            "statement_monthly_income": req.statement_monthly_income,
        },
        "computed_at": datetime.now(UTC).isoformat(),
    }


@app.post("/statement-parse")
def statement_parse(req: StatementParseRequest) -> dict:
    if req.monthly_income <= 0:
        return {"error": "monthly_income must be positive"}

    return {
        "average_monthly_income": req.monthly_income,
        "purpose_from_transactions": req.purpose_from_transactions,
        "source": "income-svc",
        "inputs": {"monthly_income": req.monthly_income, "purpose_from_transactions": req.purpose_from_transactions},
        "computed_at": datetime.now(UTC).isoformat(),
    }
