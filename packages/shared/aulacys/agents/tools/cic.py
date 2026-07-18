"""CIC bureau lookup — cic-svc when CIC_SVC_URL set, else seeded fallback.

Contract matches services/cic-svc: POST /lookup {cccd, consent_granted}.
Both paths return the same shape (max_overdue_days / cic_group / has_bad_debt)
plus overdue_days alias for older readers.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import UTC, datetime
from typing import Any

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _normalize(payload: dict[str, Any]) -> dict[str, Any]:
    """Unify cic-svc response + aliases Credit already understands."""
    out = dict(payload)
    if "max_overdue_days" in out and "overdue_days" not in out:
        out["overdue_days"] = out["max_overdue_days"]
    elif "overdue_days" in out and "max_overdue_days" not in out:
        out["max_overdue_days"] = out["overdue_days"]
    if "num_active_loans" not in out and "active_loans" in out:
        out["num_active_loans"] = out["active_loans"]
    return out


def _consent_denied(cccd: str, detail: str) -> dict[str, Any]:
    return {
        "error": "consent_required",
        "consent_required": True,
        "detail": detail,
        "cccd": cccd,
        "cic_group": 0,
        "has_bad_debt": False,
        "num_active_loans": 0,
        "max_overdue_days": 0,
        "overdue_days": 0,
        "source": "cic-svc",
        "inputs": {"cccd": cccd, "consent_granted": False},
        "computed_at": _now(),
    }


def _from_service(cccd: str, consent_granted: bool) -> dict[str, Any] | None:
    url = os.getenv("CIC_SVC_URL")
    if not url:
        return None
    try:
        req = urllib.request.Request(
            f"{url.rstrip('/')}/lookup",
            data=json.dumps({"cccd": cccd, "consent_granted": consent_granted}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310
            return _normalize(json.loads(resp.read().decode("utf-8")))
    except urllib.error.HTTPError as exc:
        if exc.code == 403:
            try:
                body = json.loads(exc.read().decode("utf-8"))
                detail = str(body.get("detail", "CIC inquiry requires customer consent"))
            except Exception:
                detail = "CIC inquiry requires customer consent"
            return _consent_denied(cccd, detail)
        return None
    except Exception:
        return None


def _fallback(cccd: str, consent_granted: bool) -> dict[str, Any]:
    """Same fields as cic-svc LookupResponse (clean group-1 stub)."""
    if not consent_granted:
        return _consent_denied(cccd, "CIC inquiry requires customer consent (consent_granted=true).")
    return {
        "cccd": cccd,
        "full_name": "Seeded CIC snapshot",
        "cic_group": 1,
        "classification": "Nợ đủ tiêu chuẩn",
        "score": 680,
        "pd": 0.05,
        "has_bad_debt": False,
        "num_active_loans": 1,
        "total_outstanding_vnd": 0,
        "monthly_debt_obligation_vnd": 0,
        "credit_limit_total_vnd": 50_000_000,
        "max_overdue_days": 0,
        "overdue_days": 0,
        "overdue_amount_vnd": 0,
        "credit_history_months": 36,
        "credit_types": ["unsecured"],
        "inquiries_last_6m": 1,
        "consent_granted": True,
        "score_breakdown": {
            "scorecard_version": "fallback",
            "pd": 0.05,
            "linear_score": 0.9,
            "components": {},
            "weights": {},
        },
        "source": "seeded_cic_snapshot",
        "inputs": {"cccd": cccd, "consent_granted": True},
        "computed_at": _now(),
    }


@tool
def cic_lookup(cccd: str, consent_granted: bool = True) -> dict:
    """CIC lookup by CCCD. Calls cic-svc when CIC_SVC_URL is set, else seeded fallback."""
    from_svc = _from_service(cccd, consent_granted)
    if from_svc is not None:
        return from_svc
    return _fallback(cccd, consent_granted)
