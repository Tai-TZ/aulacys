from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _fail(msg: str) -> dict[str, str]:
    return {"error": msg}


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def _bps(config: dict[str, Any], key: str, default: float = 0) -> float:
    return float(config.get(key, default)) / 10_000


@tool
def price_loan(
    requested_amount: float,
    term_months: int,
    verified_monthly_income: float,
    dti: float | None,
    cic_group: int = 1,
    has_bad_debt: bool = False,
    pricing: dict[str, Any] | None = None,
) -> dict:
    """Deterministic retail loan pricing and limit proposal.

    The tool proposes numbers; Credit may interpret them, but an LLM must not
    invent the limit or rate.
    """
    if requested_amount <= 0:
        return _fail("requested_amount must be positive")
    if term_months <= 0:
        return _fail("term_months must be positive")
    if verified_monthly_income <= 0:
        return _fail("verified_monthly_income must be positive")

    config = pricing or {}
    max_dti = float(config.get("max_dti", 0.5))
    base_rate = float(config.get("base_rate", 0.11))
    min_rate = float(config.get("min_rate", base_rate))
    max_rate = float(config.get("max_rate", base_rate + 0.04))
    income_multiple = float(config.get("income_multiple", 24))

    limit_by_income = verified_monthly_income * income_multiple
    limit_by_dti = requested_amount
    if isinstance(dti, int | float) and dti > max_dti:
        limit_by_dti = max(0.0, requested_amount * max_dti / dti)
    proposed_limit = 0.0 if has_bad_debt or cic_group >= 3 else min(requested_amount, limit_by_income, limit_by_dti)

    risk_premium = 0.0
    risk_premium += max(cic_group - 1, 0) * _bps(config, "cic_group_premium_bps", 75)
    if has_bad_debt:
        risk_premium += _bps(config, "bad_debt_premium_bps", 250)
    if isinstance(dti, int | float) and dti >= float(config.get("dti_premium_threshold", 0.4)):
        risk_premium += _bps(config, "dti_premium_bps", 50)
    if term_months >= int(config.get("term_premium_threshold_months", 180)):
        risk_premium += _bps(config, "term_premium_bps", 25)

    proposed_rate = _clamp(base_rate + risk_premium, min_rate, max_rate)
    decision = "priceable" if proposed_limit >= requested_amount else "limit_reduced"
    if proposed_limit <= 0:
        decision = "decline_or_manual_review"

    return {
        "proposed_limit": round(proposed_limit, 2),
        "proposed_rate": round(proposed_rate, 4),
        "decision": decision,
        "inputs": {
            "requested_amount": requested_amount,
            "term_months": term_months,
            "verified_monthly_income": verified_monthly_income,
            "dti": dti,
            "cic_group": cic_group,
            "has_bad_debt": has_bad_debt,
            "pricing": config,
        },
        "formula": (
            "limit = min(requested_amount, income * income_multiple, dti-adjusted limit); "
            "rate = clamp(base_rate + risk_premium, min_rate, max_rate)"
        ),
        "computed_at": _now(),
    }
