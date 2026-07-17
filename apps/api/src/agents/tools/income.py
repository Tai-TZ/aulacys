from __future__ import annotations

from datetime import UTC, datetime

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


@tool
def income_verify(declared_monthly_income: float, statement_monthly_income: float | None = None) -> dict:
    """Verify retail income from seeded structured statement data."""
    if declared_monthly_income <= 0:
        return {"error": "declared_monthly_income must be positive"}

    verified = statement_monthly_income if statement_monthly_income is not None else declared_monthly_income
    if verified <= 0:
        return {"error": "statement_monthly_income must be positive when provided"}

    return {
        "verified_monthly_income": verified,
        "variance": round(verified - declared_monthly_income, 2),
        "source": "seeded_bank_statement",
        "inputs": {
            "declared_monthly_income": declared_monthly_income,
            "statement_monthly_income": statement_monthly_income,
        },
        "computed_at": _now(),
    }


@tool
def salary_verify(declared_monthly_income: float, statement_monthly_income: float | None = None) -> dict:
    """Alias for salary-backed unsecured product config."""
    return income_verify.invoke(
        {
            "declared_monthly_income": declared_monthly_income,
            "statement_monthly_income": statement_monthly_income,
        }
    )


@tool
def sao_ke_parse(monthly_income: float, purpose_from_transactions: str | None = None) -> dict:
    """Parse a seeded bank statement once and expose structured fields to agents."""
    if monthly_income <= 0:
        return {"error": "monthly_income must be positive"}

    return {
        "average_monthly_income": monthly_income,
        "purpose_from_transactions": purpose_from_transactions,
        "source": "seeded_statement_extract",
        "inputs": {"monthly_income": monthly_income, "purpose_from_transactions": purpose_from_transactions},
        "computed_at": _now(),
    }
