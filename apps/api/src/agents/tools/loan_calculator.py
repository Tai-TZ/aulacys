"""Deterministic loan maths. No LLM inside this file — that is the whole contract.

Every figure that reaches a credit proposal originates here, and every return value
carries its own `inputs` and `formula` so `Critic` can trace the number back to the
call that produced it. An agent that states a DSCR without a matching tool call in the
trace is hallucinating, and gets rejected.

`AGENTS.md` §0: "An LLM never produces a number."
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TypedDict

from langchain_core.tools import tool


class CalcError(TypedDict):
    error: str


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _fail(msg: str) -> CalcError:
    """Tools return typed errors, never raise — a bad input must not kill the graph
    (`AGENTS.md` §6). The agent sees the error and can re-plan or ask for the input."""
    return {"error": msg}


@tool
def compute_dti(monthly_debt: float, monthly_income: float) -> dict:
    """Debt-to-income for a retail borrower.

    DTI = monthly debt obligations / verified monthly income. The tool measures; it
    does not decide whether the borrower is acceptable.

    Args:
        monthly_debt: Existing debt plus proposed monthly payment, VND/month.
        monthly_income: Verified borrower income, VND/month.

    Returns:
        {dti, inputs, formula, computed_at} or {error}.
    """
    if monthly_debt < 0:
        return _fail("monthly_debt must not be negative")
    if monthly_income <= 0:
        return _fail("monthly_income must be positive to compute DTI")

    return {
        "dti": round(monthly_debt / monthly_income, 4),
        "inputs": {"monthly_debt": monthly_debt, "monthly_income": monthly_income},
        "formula": "dti = monthly_debt / monthly_income",
        "computed_at": _now(),
    }


@tool
def compute_dscr(
    ebitda: float,
    existing_annual_debt_service: float,
    proposed_annual_debt_service: float,
) -> dict:
    """Debt service coverage ratio: can the borrower's cash flow cover its debt payments?

    DSCR = EBITDA / (existing annual debt service + proposed annual debt service).
    Below ~1.0 the borrower cannot service the debt from operations.

    Args:
        ebitda: Annual EBITDA, VND.
        existing_annual_debt_service: Principal + interest already owed per year, VND.
        proposed_annual_debt_service: Principal + interest the new loan would add per year, VND.

    Returns:
        {dscr, inputs, formula, computed_at} or {error}.
    """
    if ebitda < 0:
        return _fail("ebitda must not be negative")
    if existing_annual_debt_service < 0 or proposed_annual_debt_service < 0:
        return _fail("debt service must not be negative")

    total = existing_annual_debt_service + proposed_annual_debt_service
    if total <= 0:
        return _fail("total debt service must be positive to compute DSCR")

    return {
        "dscr": round(ebitda / total, 4),
        "inputs": {
            "ebitda": ebitda,
            "existing_annual_debt_service": existing_annual_debt_service,
            "proposed_annual_debt_service": proposed_annual_debt_service,
            "total_annual_debt_service": total,
        },
        "formula": "dscr = ebitda / (existing_annual_debt_service + proposed_annual_debt_service)",
        "computed_at": _now(),
    }


@tool
def compute_ltv(loan_amount: float, collateral_value: float) -> dict:
    """Loan-to-value: how much of the collateral's worth the loan represents.

    LTV = loan amount / appraised collateral value. Higher LTV = thinner cushion if
    the bank has to enforce.

    Args:
        loan_amount: Proposed loan principal, VND.
        collateral_value: Appraised collateral value, VND.

    Returns:
        {ltv, inputs, formula, computed_at} or {error}.
    """
    if loan_amount < 0:
        return _fail("loan_amount must not be negative")
    if collateral_value <= 0:
        return _fail("collateral_value must be positive to compute LTV")

    return {
        "ltv": round(loan_amount / collateral_value, 4),
        "inputs": {"loan_amount": loan_amount, "collateral_value": collateral_value},
        "formula": "ltv = loan_amount / collateral_value",
        "computed_at": _now(),
    }


@tool
def compute_exposure_ratio(
    existing_exposure: float,
    proposed_amount: float,
    bank_own_capital: float,
) -> dict:
    """Total exposure to one customer as a ratio of the bank's own capital.

    This is the metric the statutory single-customer credit limit is expressed against,
    so it is the number `Compliance` vetoes on. The limit itself is NOT here — it lives
    in `src/policy/rules/credit_limits.yaml`. This function measures; policy judges.

    Args:
        existing_exposure: Credit already extended to this customer, VND.
        proposed_amount: The new loan being considered, VND.
        bank_own_capital: The bank's own capital ("vốn tự có"), VND.

    Returns:
        {exposure_ratio_single_customer, total_exposure, inputs, formula, computed_at} or {error}.
    """
    if existing_exposure < 0 or proposed_amount < 0:
        return _fail("exposure amounts must not be negative")
    if bank_own_capital <= 0:
        return _fail("bank_own_capital must be positive to compute an exposure ratio")

    total = existing_exposure + proposed_amount

    return {
        "exposure_ratio_single_customer": round(total / bank_own_capital, 6),
        "total_exposure": total,
        "inputs": {
            "existing_exposure": existing_exposure,
            "proposed_amount": proposed_amount,
            "bank_own_capital": bank_own_capital,
        },
        "formula": "exposure_ratio = (existing_exposure + proposed_amount) / bank_own_capital",
        "computed_at": _now(),
    }


@tool
def compute_annual_debt_service(
    principal: float,
    annual_rate: float,
    term_months: int,
) -> dict:
    """Annual principal + interest for a standard amortising term loan.

    Uses the annuity formula, so `Credit` can size a payment before proposing terms
    rather than guessing at one.

    Args:
        principal: Loan principal, VND.
        annual_rate: Nominal annual interest rate as a decimal (0.11 = 11%/yr).
        term_months: Loan tenor in months.

    Returns:
        {annual_debt_service, monthly_payment, total_interest, inputs, formula, computed_at}
        or {error}.
    """
    if principal <= 0:
        return _fail("principal must be positive")
    if annual_rate < 0:
        return _fail("annual_rate must not be negative")
    if term_months <= 0:
        return _fail("term_months must be positive")

    r = annual_rate / 12
    n = term_months

    if r == 0:
        monthly = principal / n
    else:
        factor = (1 + r) ** n
        monthly = principal * r * factor / (factor - 1)

    total_paid = monthly * n

    return {
        "annual_debt_service": round(monthly * 12, 2),
        "monthly_payment": round(monthly, 2),
        "total_interest": round(total_paid - principal, 2),
        "inputs": {"principal": principal, "annual_rate": annual_rate, "term_months": term_months},
        "formula": "monthly = P*r*(1+r)^n / ((1+r)^n - 1), r = annual_rate/12, n = term_months",
        "computed_at": _now(),
    }


#: Tools `Credit` is allowed to call. Least privilege: it measures and prices, it does
#: not screen sanctions and it cannot write anything.
CREDIT_TOOLS = [
    compute_dti,
    compute_dscr,
    compute_ltv,
    compute_exposure_ratio,
    compute_annual_debt_service,
]

RETAIL_CREDIT_TOOLS = [
    compute_dti,
    compute_ltv,
    compute_annual_debt_service,
]
