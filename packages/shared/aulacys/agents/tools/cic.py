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
        "status": "invalid",
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


_GROUP_LABELS: dict[int, str] = {
    1: "Nợ đủ tiêu chuẩn",
    2: "Nợ cần chú ý",
    3: "Nợ dưới tiêu chuẩn",
    4: "Nợ nghi ngờ",
    5: "Nợ có khả năng mất vốn",
}

_SEED_CACHE: dict[str, Any] | None = None


def _seed_path() -> str:
    # tools → agents → aulacys → shared → packages → repo root
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), *([".."] * 5)))
    return os.path.join(root, "services", "cic-svc", "seed", "cic_records.json")


def _load_seed() -> dict[str, Any]:
    global _SEED_CACHE
    if _SEED_CACHE is not None:
        return _SEED_CACHE
    path = _seed_path()
    try:
        with open(path, encoding="utf-8") as fh:
            _SEED_CACHE = json.load(fh)
    except Exception:
        _SEED_CACHE = {"_meta": {"version": "fallback"}, "_default": {}}
    return _SEED_CACHE


def _fallback(cccd: str, consent_granted: bool) -> dict[str, Any]:
    """Load cic_records.json (same seed as cic-svc) when CIC_SVC_URL is unset."""
    if not consent_granted:
        return _consent_denied(cccd, "CIC inquiry requires customer consent (consent_granted=true).")

    data = _load_seed()
    record_found = cccd in data and not str(cccd).startswith("_")
    rec = data.get(cccd) if record_found else data.get("_default", {})
    if not isinstance(rec, dict):
        rec = {}

    debt_group = int(rec.get("debt_group") or 1)
    max_overdue_days = int(rec.get("max_overdue_days", 0))
    overdue_amount = int(rec.get("overdue_amount_vnd", 0))
    outstanding = int(rec.get("outstanding_debt", rec.get("total_outstanding_vnd", 0)) or 0)
    overdue_history = rec.get("overdue_history")
    if not isinstance(overdue_history, dict):
        overdue_history = {
            "count": 0 if max_overdue_days == 0 else 1,
            "max_days": max_overdue_days,
            "amount_vnd": overdue_amount,
        }
    version = str((data.get("_meta") or {}).get("version") or "fallback")
    monthly = rec.get("monthly_debt_obligation_vnd")
    return {
        "status": "checked",
        "cccd": cccd,
        "customer_id": rec.get("customer_id"),
        "full_name": str(rec.get("full_name") or "Khách hàng mặc định (dữ liệu tổng hợp)"),
        "debt_group": debt_group,
        "cic_group": debt_group,
        "classification": _GROUP_LABELS.get(debt_group, "Không xác định"),
        "score": 680 if debt_group == 1 else max(300, 700 - debt_group * 40),
        "pd": round(0.02 * debt_group, 4),
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
        "monthly_debt_obligation_vnd": int(monthly) if monthly is not None else 0,
        "credit_limit_total_vnd": int(rec.get("credit_limit_total_vnd", 50_000_000)),
        "max_overdue_days": max_overdue_days,
        "overdue_days": max_overdue_days,
        "overdue_amount_vnd": overdue_amount,
        "credit_history_months": int(rec.get("credit_history_months", 36)),
        "credit_types": list(rec.get("credit_types") or ["unsecured"]),
        "credit_types_vi": list(rec.get("credit_types_vi") or ["Vay tín chấp"]),
        "inquiries_last_6m": int(rec.get("inquiries_last_6m", 1)),
        "consent_granted": True,
        "score_breakdown": {
            "scorecard_version": "seed-fallback",
            "pd": round(0.02 * debt_group, 4),
            "linear_score": round(1.0 - 0.1 * debt_group, 2),
            "components": {},
            "weights": {},
        },
        "source": "seeded_cic_snapshot",
        "dataset_version": version,
        "evidence_id": f"CIC-{cccd}" if record_found else "CIC-SYNTHETIC-FALLBACK",
        "record_found": record_found,
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
