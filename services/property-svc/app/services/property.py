from __future__ import annotations
from datetime import UTC, datetime
from app.repositories import seed as repo

def health_payload() -> dict:
    return {"status": "ok", "seeded_parcels": [k for k in repo.load_seed() if not k.startswith("_")]}

def valuation(collateral_value: float, parcel_id: str | None) -> dict:
    if collateral_value <= 0:
        return {"error": "collateral_value must be positive"}
    parcel = repo.load_seed().get(parcel_id or "", {})
    return {
        "valuation": parcel.get("valuation", collateral_value),
        "method": "property-svc_desktop_valuation",
        "source": "property-svc",
        "inputs": {"collateral_value": collateral_value, "parcel_id": parcel_id},
        "computed_at": datetime.now(UTC).isoformat(),
    }

def land_registry(has_dispute: bool, zoning_flag: bool, parcel_id: str | None) -> dict:
    parcel = repo.load_seed().get(parcel_id or "", {})
    has_dispute = bool(parcel.get("has_dispute", has_dispute))
    zoning_flag = bool(parcel.get("zoning_flag", zoning_flag))
    flags: list[str] = []
    if has_dispute:
        flags.append("dispute")
    if zoning_flag:
        flags.append("zoning_flag")
    return {
        "clear": not flags,
        "legal_flags": flags,
        "source": "property-svc",
        "inputs": {"has_dispute": has_dispute, "zoning_flag": zoning_flag, "parcel_id": parcel_id},
        "computed_at": datetime.now(UTC).isoformat(),
    }

def doc_checklist(required: list[str], provided: list[str]) -> dict:
    missing = [doc for doc in required if doc not in set(provided)]
    return {
        "status": "complete" if not missing else "missing",
        "missing": missing,
        "source": "property-svc",
        "inputs": {"required": required, "provided": provided},
        "computed_at": datetime.now(UTC).isoformat(),
    }
