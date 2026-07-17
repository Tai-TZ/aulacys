from __future__ import annotations

from datetime import UTC, datetime

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


@tool
def property_valuation(collateral_value: float) -> dict:
    """Return a deterministic collateral valuation for the demo."""
    if collateral_value <= 0:
        return {"error": "collateral_value must be positive"}

    return {
        "valuation": collateral_value,
        "method": "seeded_desktop_valuation",
        "inputs": {"collateral_value": collateral_value},
        "computed_at": _now(),
    }


@tool
def land_registry(has_dispute: bool = False, zoning_flag: bool = False) -> dict:
    """Seeded land-registry/legal check for collateral."""
    flags: list[str] = []
    if has_dispute:
        flags.append("dispute")
    if zoning_flag:
        flags.append("zoning_flag")

    return {
        "clear": not flags,
        "legal_flags": flags,
        "source": "seeded_land_registry",
        "inputs": {"has_dispute": has_dispute, "zoning_flag": zoning_flag},
        "computed_at": _now(),
    }


@tool
def doc_checklist(required: list[str], provided: list[str]) -> dict:
    """Check product-required documents against provided document kinds."""
    missing = [doc for doc in required if doc not in set(provided)]
    return {
        "status": "complete" if not missing else "missing",
        "missing": missing,
        "inputs": {"required": required, "provided": provided},
        "computed_at": _now(),
    }
