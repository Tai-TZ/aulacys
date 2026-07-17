from __future__ import annotations

import json
import os
import urllib.request
from datetime import UTC, datetime

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _from_service(path: str, payload: dict) -> dict | None:
    url = os.getenv("INCOME_SVC_URL")
    if not url:
        return None
    try:
        req = urllib.request.Request(
            f"{url.rstrip('/')}/{path.lstrip('/')}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


@tool
def income_verify(declared_monthly_income: float, statement_monthly_income: float | None = None) -> dict:
    """Verify retail income. Calls income-svc when INCOME_SVC_URL is set, else fallback."""
    from_svc = _from_service(
        "verify",
        {
            "declared_monthly_income": declared_monthly_income,
            "statement_monthly_income": statement_monthly_income,
        },
    )
    if from_svc is not None:
        return from_svc

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
    """Parse a statement. Calls income-svc when INCOME_SVC_URL is set, else fallback."""
    from_svc = _from_service(
        "statement-parse",
        {"monthly_income": monthly_income, "purpose_from_transactions": purpose_from_transactions},
    )
    if from_svc is not None:
        return from_svc

    if monthly_income <= 0:
        return {"error": "monthly_income must be positive"}

    return {
        "average_monthly_income": monthly_income,
        "purpose_from_transactions": purpose_from_transactions,
        "source": "seeded_statement_extract",
        "inputs": {"monthly_income": monthly_income, "purpose_from_transactions": purpose_from_transactions},
        "computed_at": _now(),
    }
