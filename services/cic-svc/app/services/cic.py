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
    record_found = cccd in data
    rec = data.get(cccd, data["_default"])
    scored = scoring.score_profile(rec)
    # Prefer seeded debt_group; fall back to scorecard derivation
    debt_group = int(rec.get("debt_group") or scored["cic_group"])
    max_overdue_days = int(rec.get("max_overdue_days", 0))
    overdue_amount = int(rec.get("overdue_amount_vnd", 0))
    outstanding = int(
        rec.get("outstanding_debt", rec.get("total_outstanding_vnd", 0))
    )
    overdue_history = rec.get("overdue_history")
    if not isinstance(overdue_history, dict):
        overdue_history = {
            "count": 0 if max_overdue_days == 0 else 1,
            "max_days": max_overdue_days,
            "amount_vnd": overdue_amount,
        }

    return {
        "status": "checked",
        "cccd": cccd,
        "customer_id": rec.get("customer_id"),
        "full_name": str(rec.get("full_name", "")),
        "debt_group": debt_group,
        "cic_group": debt_group,
        "classification": _GROUP_LABELS.get(debt_group, "Không xác định"),
        "score": int(scored["score"]),
        "pd": float(scored["pd"]),
        "has_bad_debt": debt_group >= 3,
        "outstanding_debt": outstanding,
        "number_of_institutions": int(rec.get("number_of_institutions", 0)),
        "institutions": list(rec.get("institutions") or []),
        "overdue_history": {
            "count": int(overdue_history.get("count", 0)),
            "max_days": int(overdue_history.get("max_days", max_overdue_days)),
            "amount_vnd": int(overdue_history.get("amount_vnd", overdue_amount)),
        },
        "num_active_loans": int(rec.get("num_active_loans", 0)),
        "total_outstanding_vnd": outstanding,
        "monthly_debt_obligation_vnd": (
            int(rec["monthly_debt_obligation_vnd"])
            if rec.get("monthly_debt_obligation_vnd") is not None
            else None
        ),
        "credit_limit_total_vnd": int(rec.get("credit_limit_total_vnd", 0)),
        "max_overdue_days": max_overdue_days,
        "overdue_amount_vnd": overdue_amount,
        "credit_history_months": int(rec.get("credit_history_months", 0)),
        "credit_types": list(rec.get("credit_types") or []),
        "credit_types_vi": list(rec.get("credit_types_vi") or []),
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
        "dataset_version": data["_meta"]["version"],
        "evidence_id": f"CIC-{cccd}" if record_found else "CIC-SYNTHETIC-DEFAULT",
        "record_found": record_found,
        "inputs": {"cccd": cccd, "consent_granted": True},
        "computed_at": datetime.now(UTC).isoformat(),
    }
