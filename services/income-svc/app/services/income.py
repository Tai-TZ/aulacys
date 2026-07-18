from __future__ import annotations
from datetime import UTC, datetime

def verify(declared_monthly_income: float, statement_monthly_income: float | None) -> dict:
    if declared_monthly_income <= 0:
        return {"error": "declared_monthly_income must be positive"}
    verified = statement_monthly_income if statement_monthly_income is not None else declared_monthly_income
    if verified <= 0:
        return {"error": "statement_monthly_income must be positive when provided"}
    return {
        "verified_monthly_income": verified,
        "variance": round(verified - declared_monthly_income, 2),
        "source": "income-svc",
        "inputs": {
            "declared_monthly_income": declared_monthly_income,
            "statement_monthly_income": statement_monthly_income,
        },
        "computed_at": datetime.now(UTC).isoformat(),
    }

def statement_parse(monthly_income: float, purpose_from_transactions: str | None) -> dict:
    if monthly_income <= 0:
        return {"error": "monthly_income must be positive"}
    return {
        "average_monthly_income": monthly_income,
        "purpose_from_transactions": purpose_from_transactions,
        "source": "income-svc",
        "inputs": {"monthly_income": monthly_income, "purpose_from_transactions": purpose_from_transactions},
        "computed_at": datetime.now(UTC).isoformat(),
    }
