"""Regional minimum net-income floor (SOP 3.C.1) — deterministic, no LLM."""

from __future__ import annotations

from datetime import UTC, datetime

from langchain_core.tools import tool

# Midpoints of confirmed SOP bands (FLOW-BUSINESS-CONFIRMED §3.C.1).
FLOOR_HN_HCM_VND = 7_500_000
FLOOR_OTHER_VND = 4_750_000

_METRO = frozenset(
    {
        "hà nội",
        "ha noi",
        "tp. hồ chí minh",
        "tp ho chi minh",
        "hồ chí minh",
        "ho chi minh",
        "tp.hcm",
        "tphcm",
        "hcm",
    }
)


def _now() -> str:
    return datetime.now(UTC).isoformat()


def normalize_province(province: str | None) -> str:
    return " ".join((province or "").strip().lower().split())


def regional_income_floor(province: str | None) -> tuple[str, int]:
    """Return (region_key, floor_vnd) for a Vietnam province label."""
    key = normalize_province(province)
    if not key:
        return ("unknown", FLOOR_OTHER_VND)
    if key in _METRO or key.startswith("hà nội") or "hồ chí minh" in key or key.endswith("hcm"):
        return ("hanoi_hcm", FLOOR_HN_HCM_VND)
    return ("other_province", FLOOR_OTHER_VND)


def extract_province_from_address(address: str | None) -> str | None:
    if not address:
        return None
    parts = [p.strip() for p in address.split(",") if p.strip()]
    return parts[-1] if parts else None


@tool
def regional_income_check(province: str | None, verified_monthly_income: float) -> dict:
    """Compare verified income against the regional minimum floor."""
    region, floor = regional_income_floor(province)
    income = float(verified_monthly_income or 0)
    meets = income >= floor
    return {
        "status": "checked",
        "province": province,
        "region": region,
        "floor_vnd": floor,
        "verified_monthly_income": income,
        "meets_minimum": meets,
        "source": "regional_income_policy",
        "dataset_version": "2026.1",
        "evidence_id": f"REGION-{region}",
        "inputs": {"province": province, "verified_monthly_income": income},
        "computed_at": _now(),
    }
