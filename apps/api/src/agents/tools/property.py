from __future__ import annotations

import json
import os
import urllib.request
from datetime import UTC, datetime

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _from_service(path: str, payload: dict) -> dict | None:
    url = os.getenv("PROPERTY_SVC_URL")
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
def property_valuation(collateral_value: float, parcel_id: str | None = None) -> dict:
    """Property valuation. Calls property-svc when PROPERTY_SVC_URL is set, else fallback."""
    from_svc = _from_service(
        "valuation",
        {"collateral_value": collateral_value, "parcel_id": parcel_id},
    )
    if from_svc is not None:
        return from_svc

    if collateral_value <= 0:
        return {"error": "collateral_value must be positive"}

    return {
        "valuation": collateral_value,
        "method": "seeded_desktop_valuation",
        "inputs": {"collateral_value": collateral_value, "parcel_id": parcel_id},
        "computed_at": _now(),
    }


@tool
def schedule_valuation(application_id: str, parcel_id: str | None = None) -> dict:
    """Schedule collateral valuation. Calls property-svc when set, else fallback."""
    from_svc = _from_service("schedule-valuation", {"application_id": application_id, "parcel_id": parcel_id})
    if from_svc is not None:
        return from_svc

    return {
        "task_id": f"VAL-{application_id.upper()}",
        "status": "scheduled",
        "parcel_id": parcel_id,
        "scheduled_at": _now(),
        "inputs": {"application_id": application_id, "parcel_id": parcel_id},
    }


@tool
def land_registry(
    has_dispute: bool = False,
    zoning_flag: bool = False,
    parcel_id: str | None = None,
) -> dict:
    """Land-registry/legal check. Calls property-svc when PROPERTY_SVC_URL is set, else fallback."""
    from_svc = _from_service(
        "land-registry",
        {"has_dispute": has_dispute, "zoning_flag": zoning_flag, "parcel_id": parcel_id},
    )
    if from_svc is not None:
        return from_svc

    flags: list[str] = []
    if has_dispute:
        flags.append("dispute")
    if zoning_flag:
        flags.append("zoning_flag")

    return {
        "clear": not flags,
        "legal_flags": flags,
        "source": "seeded_land_registry",
        "inputs": {"has_dispute": has_dispute, "zoning_flag": zoning_flag, "parcel_id": parcel_id},
        "computed_at": _now(),
    }


@tool
def doc_checklist(required: list[str], provided: list[str]) -> dict:
    """Check product-required documents. Calls property-svc when set, else fallback."""
    from_svc = _from_service("doc-checklist", {"required": required, "provided": provided})
    if from_svc is not None:
        return from_svc

    missing = [doc for doc in required if doc not in set(provided)]
    return {
        "status": "complete" if not missing else "missing",
        "missing": missing,
        "inputs": {"required": required, "provided": provided},
        "computed_at": _now(),
    }
