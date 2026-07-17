from __future__ import annotations

from datetime import UTC, datetime

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


@tool
def aml_screen(sanctions_match_count: int = 0, pep_match_count: int = 0) -> dict:
    """Seeded AML screen; external provider fallback for the demo."""
    if sanctions_match_count < 0 or pep_match_count < 0:
        return {"error": "match counts must not be negative"}

    return {
        "sanctions_match_count": sanctions_match_count,
        "pep_match_count": pep_match_count,
        "inputs": {
            "sanctions_match_count": sanctions_match_count,
            "pep_match_count": pep_match_count,
        },
        "computed_at": _now(),
    }


@tool
def related_party(exposure_ratio_related_group: float = 0) -> dict:
    """Seeded related-party exposure screen."""
    if exposure_ratio_related_group < 0:
        return {"error": "exposure_ratio_related_group must not be negative"}

    return {
        "exposure_ratio_related_group": exposure_ratio_related_group,
        "inputs": {"exposure_ratio_related_group": exposure_ratio_related_group},
        "computed_at": _now(),
    }
