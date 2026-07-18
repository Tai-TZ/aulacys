"""Mock CIC scorecard — FICO-style weights + logistic PD → CIC scale [403, 706].

Real national CIC is not callable. This module encodes seeded bureau fields into
component scores X_i, forms a linear score, maps to PD via logistic, then
normalizes odds to the public CIC range.
"""

from __future__ import annotations

import math
from typing import Any

# §3 weights (sum = 1.0)
WEIGHTS: dict[str, float] = {
    "payment_history": 0.35,
    "utilization": 0.30,
    "credit_history_length": 0.15,
    "credit_mix": 0.10,
    "new_credit": 0.10,
}

# §4.2 — map PD odds onto CIC [403, 706]
SCORE_MIN = 403
SCORE_MAX = 706
# Midpoint when PD = 0.5 (ln(odds) = 0)
OFFSET = (SCORE_MIN + SCORE_MAX) / 2  # 554.5
# Span ≈ 2 * FACTOR * ln(99) covers PD ∈ [0.01, 0.99]
FACTOR = (SCORE_MAX - SCORE_MIN) / (2 * math.log(99.0))  # ≈ 32.97

# Logistic steepness for Z → PD (Z ∈ [0, 1], higher Z = better)
_LOGIT_K = 6.0

_VALID_CREDIT_TYPES = frozenset({"secured", "unsecured", "card"})


def encode_payment_history(max_overdue_days: int, overdue_amount_vnd: int) -> float:
    """On-time accumulates points; late / bad-debt jump → heavy penalty (35%)."""
    days = max(0, int(max_overdue_days))
    if days == 0 and overdue_amount_vnd <= 0:
        return 1.0
    if days <= 10:
        return 0.80
    if days <= 30:
        return 0.50
    if days <= 90:
        return 0.25
    return 0.0  # >90 days ≈ jump to bad-debt group


def encode_utilization(outstanding_vnd: int, credit_limit_vnd: int) -> float:
    """Debt / limit — using >30% of limit starts deducting (30%)."""
    if credit_limit_vnd <= 0:
        return 0.20 if outstanding_vnd > 0 else 0.60
    ratio = outstanding_vnd / credit_limit_vnd
    if ratio <= 0.30:
        return 1.0
    if ratio <= 0.50:
        return 0.70
    if ratio <= 0.70:
        return 0.40
    if ratio <= 1.0:
        return 0.15
    return 0.05  # over-limit


def encode_credit_history_length(months: int) -> float:
    """Longer healthy history → more points (15%)."""
    m = max(0, int(months))
    if m >= 60:
        return 1.0
    if m >= 36:
        return 0.75
    if m >= 12:
        return 0.50
    if m >= 1:
        return 0.25
    return 0.10


def encode_credit_mix(credit_types: list[str] | None) -> float:
    """Diverse portfolio (secured / unsecured / card) scores higher (10%)."""
    types = {t for t in (credit_types or []) if t in _VALID_CREDIT_TYPES}
    n = len(types)
    if n >= 3:
        return 1.0
    if n == 2:
        return 0.70
    if n == 1:
        return 0.40
    return 0.20


def encode_new_credit(inquiries_last_6m: int) -> float:
    """Frequent recent bureau inquiries lower the score (10%)."""
    n = max(0, int(inquiries_last_6m))
    if n <= 1:
        return 1.0
    if n <= 3:
        return 0.70
    if n <= 6:
        return 0.40
    return 0.15


def encode_components(profile: dict[str, Any]) -> dict[str, float]:
    outstanding = int(profile.get("total_outstanding_vnd", 0))
    limit = int(profile.get("credit_limit_total_vnd", 0))
    return {
        "payment_history": encode_payment_history(
            int(profile.get("max_overdue_days", 0)),
            int(profile.get("overdue_amount_vnd", 0)),
        ),
        "utilization": encode_utilization(outstanding, limit),
        "credit_history_length": encode_credit_history_length(
            int(profile.get("credit_history_months", 0)),
        ),
        "credit_mix": encode_credit_mix(profile.get("credit_types")),
        "new_credit": encode_new_credit(int(profile.get("inquiries_last_6m", 0))),
    }


def linear_score(components: dict[str, float]) -> float:
    """§4.1 — Score_lin = Σ β_i · X_i  (β_i = weights, X_i ∈ [0, 1])."""
    return sum(WEIGHTS[k] * components[k] for k in WEIGHTS)


def pd_from_linear(z: float) -> float:
    """Logistic PD: higher linear score → lower default probability."""
    z_clamped = min(1.0, max(0.0, z))
    # Centered at 0.5 so average profile ≈ PD 50% before calibration
    return 1.0 / (1.0 + math.exp(_LOGIT_K * (z_clamped - 0.5)))


def cic_score_from_pd(pd: float) -> int:
    """§4.2 — Score = Offset + Factor · ln((1−PD)/PD), clipped to [403, 706]."""
    pd_safe = min(0.999, max(0.001, pd))
    raw = OFFSET + FACTOR * math.log((1.0 - pd_safe) / pd_safe)
    return int(round(min(SCORE_MAX, max(SCORE_MIN, raw))))


def cic_group_from_overdue(max_overdue_days: int) -> int:
    """Debt group from days past due (simplified TT02/2013 · TT31/2024).

    Score (FICO-style) and debt group are related but distinct: group is
    regulatory classification of outstanding facilities; score is PD odds.
    """
    days = max(0, int(max_overdue_days))
    if days == 0:
        return 1
    if days <= 90:
        return 2
    if days <= 180:
        return 3
    if days <= 360:
        return 4
    return 5


def score_profile(profile: dict[str, Any]) -> dict[str, Any]:
    """Full mock scorecard pipeline for one bureau profile."""
    components = encode_components(profile)
    z = linear_score(components)
    pd = pd_from_linear(z)
    score = cic_score_from_pd(pd)
    cic_group = cic_group_from_overdue(int(profile.get("max_overdue_days", 0)))
    return {
        "score": score,
        "pd": round(pd, 6),
        "linear_score": round(z, 6),
        "cic_group": cic_group,
        "components": {k: round(v, 4) for k, v in components.items()},
        "weights": dict(WEIGHTS),
        "scorecard_version": "mock-cic-v1",
    }
