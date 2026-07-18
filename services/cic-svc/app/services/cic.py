from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.repositories import seed as repo
from app.services import scoring

# TT02/2013 · TT31/2024 debt groups (see docs/DATA_DICTIONARY.md)
_GROUP_LABELS: dict[int, str] = {
    1: "Nợ đủ tiêu chuẩn",
    2: "Nợ cần chú ý",
    3: "Nợ dưới tiêu chuẩn",
    4: "Nợ nghi ngờ",
    5: "Nợ có khả năng mất vốn",
}


def seeded_cccds() -> list[str]:
    return [k for k in repo.load_seed() if not k.startswith("_")]


def lookup(cccd: str, *, consent_granted: bool) -> dict[str, Any]:
    """Bureau mock: require consent, load profile by CCCD, run scorecard.

    Unknown CCCD → ``_default`` so the demo path never crashes.
    """
    if not consent_granted:
        return {
            "error": "consent_required",
            "detail": "CIC inquiry requires customer consent (consent_granted=true).",
            "cccd": cccd,
            "source": "cic-svc",
        }

    data = repo.load_seed()
    rec = data.get(cccd, data["_default"])
    scored = scoring.score_profile(rec)
    cic_group = int(scored["cic_group"])

    return {
        "cccd": cccd,
        "full_name": str(rec.get("full_name", "")),
        "cic_group": cic_group,
        "classification": _GROUP_LABELS.get(cic_group, "Không xác định"),
        "score": int(scored["score"]),
        "pd": float(scored["pd"]),
        "has_bad_debt": cic_group >= 3,
        "num_active_loans": int(rec.get("num_active_loans", 0)),
        "total_outstanding_vnd": int(rec.get("total_outstanding_vnd", 0)),
        "credit_limit_total_vnd": int(rec.get("credit_limit_total_vnd", 0)),
        "max_overdue_days": int(rec.get("max_overdue_days", 0)),
        "overdue_amount_vnd": int(rec.get("overdue_amount_vnd", 0)),
        "credit_history_months": int(rec.get("credit_history_months", 0)),
        "credit_types": list(rec.get("credit_types") or []),
        "inquiries_last_6m": int(rec.get("inquiries_last_6m", 0)),
        "consent_granted": True,
        "score_breakdown": {
            "scorecard_version": scored["scorecard_version"],
            "pd": scored["pd"],
            "linear_score": scored["linear_score"],
            "components": scored["components"],
            "weights": scored["weights"],
        },
        "source": "cic-svc",
        "inputs": {"cccd": cccd, "consent_granted": True},
        "computed_at": datetime.now(UTC).isoformat(),
    }
