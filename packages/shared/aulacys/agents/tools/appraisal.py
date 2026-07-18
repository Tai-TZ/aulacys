"""Deterministic retail appraisal checks (FLOW-BUSINESS-CONFIRMED §3.A–3.C).

No LLM — tools measure; policy judges.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from langchain_core.tools import tool

AGE_MIN = 22
AGE_MAX_AT_MATURITY = 60
INCOME_MULTIPLE_MAX = 12.0
DISPOSABLE_BUFFER_MIN_VND = 3_500_000

_LARGE_PURPOSE_KEYWORDS = (
    "sửa nhà",
    "sua nha",
    "sửa chữa",
    "sua chua",
    "ô tô",
    "o to",
    "xe hơi",
    "xe hoi",
    "xe máy",
    "xe may",
    "mua nhà",
    "mua nha",
    "nội thất",
    "noi that",
)

_SMALL_PURPOSE_KEYWORDS = (
    "mua sắm",
    "mua sam",
    "tiêu dùng",
    "tieu dung",
    "chi tiêu",
    "chi tieu",
)


def _now() -> str:
    return datetime.now(UTC).isoformat()


def parse_dob(dob: str | None) -> date | None:
    if not dob:
        return None
    text = str(dob).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def add_months(start: date, months: int) -> date:
    months = int(months)
    year = start.year + (start.month - 1 + months) // 12
    month = (start.month - 1 + months) % 12 + 1
    # Clamp day for shorter months
    if month == 2:
        leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
        last = 29 if leap else 28
    elif month in {4, 6, 9, 11}:
        last = 30
    else:
        last = 31
    return date(year, month, min(start.day, last))


def age_years(born: date, on: date) -> float:
    days = (on - born).days
    return round(days / 365.25, 4)


def dti_cap_for_income(monthly_income: float) -> float:
    income = float(monthly_income or 0)
    if income < 10_000_000:
        return 0.35
    if income <= 30_000_000:
        return 0.45
    return 0.55


def purpose_term_band(purpose: str | None) -> str:
    text = (purpose or "").lower()
    if any(k in text for k in _LARGE_PURPOSE_KEYWORDS):
        return "large"  # 36–60
    if any(k in text for k in _SMALL_PURPOSE_KEYWORDS):
        return "small"  # 12–24
    return "unspecified"


@tool
def age_at_maturity_check(dob: str | None, term_months: int, as_of: str | None = None) -> dict:
    """Age at loan maturity must stay in [22, 60]."""
    born = parse_dob(dob)
    if born is None:
        return {
            "status": "invalid",
            "within_range": False,
            "reason": "missing_or_invalid_dob",
            "inputs": {"dob": dob, "term_months": term_months},
            "computed_at": _now(),
        }
    today = parse_dob(as_of) if as_of else date.today()
    if today is None:
        today = date.today()
    maturity = add_months(today, int(term_months or 0))
    age_now = age_years(born, today)
    age_maturity = age_years(born, maturity)
    within = AGE_MIN <= age_now and age_maturity <= AGE_MAX_AT_MATURITY
    return {
        "status": "checked",
        "dob": born.isoformat(),
        "as_of": today.isoformat(),
        "maturity_date": maturity.isoformat(),
        "age_now": age_now,
        "age_at_maturity": age_maturity,
        "min_age": AGE_MIN,
        "max_age_at_maturity": AGE_MAX_AT_MATURITY,
        "within_range": within,
        "reason": None if within else "age_outside_policy",
        "inputs": {"dob": dob, "term_months": term_months, "as_of": as_of},
        "computed_at": _now(),
    }


@tool
def amount_within_income_multiple(
    requested_amount: float,
    verified_monthly_income: float,
    max_multiple: float = INCOME_MULTIPLE_MAX,
) -> dict:
    """Requested amount must be ≤ max_multiple × verified monthly net income."""
    income = float(verified_monthly_income or 0)
    amount = float(requested_amount or 0)
    if income <= 0:
        return {
            "status": "invalid",
            "within_limit": False,
            "reason": "income_not_positive",
            "inputs": {"requested_amount": amount, "verified_monthly_income": income},
            "computed_at": _now(),
        }
    multiple = round(amount / income, 4)
    within = multiple <= float(max_multiple)
    return {
        "status": "checked",
        "requested_amount": amount,
        "verified_monthly_income": income,
        "income_multiple": multiple,
        "max_multiple": float(max_multiple),
        "within_limit": within,
        "reason": None if within else "amount_exceeds_income_multiple",
        "inputs": {
            "requested_amount": amount,
            "verified_monthly_income": income,
            "max_multiple": max_multiple,
        },
        "computed_at": _now(),
    }


@tool
def term_matches_purpose(term_months: int, declared_purpose: str | None) -> dict:
    """Map purpose → tenor band: small 12–24m, large 36–60m."""
    term = int(term_months or 0)
    band = purpose_term_band(declared_purpose)
    if band == "large":
        matches = 36 <= term <= 60
        expected = "36-60"
    elif band == "small":
        matches = 12 <= term <= 24
        expected = "12-24"
    else:
        # Unspecified purpose: allow either published band, not the awkward middle.
        matches = (12 <= term <= 24) or (36 <= term <= 60)
        expected = "12-24|36-60"
    return {
        "status": "checked",
        "term_months": term,
        "purpose_band": band,
        "expected_term_months": expected,
        "matches": matches,
        "reason": None if matches else "term_purpose_mismatch",
        "inputs": {"term_months": term, "declared_purpose": declared_purpose},
        "computed_at": _now(),
    }


@tool
def dti_within_income_band(dti: float | None, verified_monthly_income: float) -> dict:
    """DTI must stay within the income-band cap (35% / 45% / 55%)."""
    if dti is None:
        return {
            "status": "invalid",
            "within_band": False,
            "reason": "dti_missing",
            "inputs": {"dti": dti, "verified_monthly_income": verified_monthly_income},
            "computed_at": _now(),
        }
    income = float(verified_monthly_income or 0)
    cap = dti_cap_for_income(income)
    value = float(dti)
    within = value <= cap
    if income < 10_000_000:
        band = "lt_10m"
    elif income <= 30_000_000:
        band = "10_to_30m"
    else:
        band = "gt_30m"
    return {
        "status": "checked",
        "dti": value,
        "income_band": band,
        "band_cap": cap,
        "within_band": within,
        "reason": None if within else "dti_exceeds_income_band",
        "inputs": {"dti": value, "verified_monthly_income": income},
        "computed_at": _now(),
    }


@tool
def disposable_income_buffer(
    verified_monthly_income: float,
    monthly_debt: float,
    min_buffer_vnd: float = DISPOSABLE_BUFFER_MIN_VND,
    personal_expense: float | None = None,
) -> dict:
    """Net income − monthly debt obligations must cover living-cost buffer (~3.5tr)."""
    income = float(verified_monthly_income or 0)
    debt = float(monthly_debt or 0)
    floor = float(min_buffer_vnd)
    surplus = round(income - debt, 2)
    meets = surplus >= floor
    return {
        "status": "checked",
        "verified_monthly_income": income,
        "monthly_debt": debt,
        "personal_expense": personal_expense,
        "surplus_vnd": surplus,
        "min_buffer_vnd": floor,
        "meets_buffer": meets,
        "reason": None if meets else "disposable_buffer_shortfall",
        "inputs": {
            "verified_monthly_income": income,
            "monthly_debt": debt,
            "min_buffer_vnd": min_buffer_vnd,
            "personal_expense": personal_expense,
        },
        "computed_at": _now(),
    }


def flags_from_appraisal_tools(results: dict[str, Any]) -> dict[str, float]:
    """Map tool payloads → policy flags for Compliance."""
    age = results.get("age_at_maturity_check") or {}
    multiple = results.get("amount_within_income_multiple") or {}
    term = results.get("term_matches_purpose") or {}
    dti_band = results.get("dti_within_income_band") or {}
    buffer = results.get("disposable_income_buffer") or {}
    return {
        "age_at_maturity_ok": 1.0 if age.get("within_range") else 0.0,
        "amount_within_income_multiple": 1.0 if multiple.get("within_limit") else 0.0,
        "term_matches_purpose": 1.0 if term.get("matches") else 0.0,
        "dti_within_income_band": 1.0 if dti_band.get("within_band") else 0.0,
        "disposable_buffer_ok": 1.0 if buffer.get("meets_buffer") else 0.0,
    }
