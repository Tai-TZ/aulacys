from __future__ import annotations
from datetime import UTC, datetime
from app.repositories import seed as repo

def health_payload() -> dict:
    data = repo.load_seed()
    return {
        "status": "ok",
        "sanctions_records": len(data["sanctions_list"]),
        "pep_records": len(data["pep_list"]),
    }

def screen(sanctions_match_count: int, pep_match_count: int, customer_name: str | None) -> dict:
    data = repo.load_seed()
    sanctions_names = set(data["sanctions_list"])
    pep_names = set(data["pep_list"])
    sanctions_count = sanctions_match_count
    pep_count = pep_match_count
    if customer_name in sanctions_names:
        sanctions_count = max(sanctions_count, 1)
    if customer_name in pep_names:
        pep_count = max(pep_count, 1)
    if sanctions_count < 0 or pep_count < 0:
        return {"error": "match counts must not be negative"}
    return {
        "sanctions_match_count": sanctions_count,
        "pep_match_count": pep_count,
        "source": "aml-svc",
        "inputs": {
            "sanctions_match_count": sanctions_match_count,
            "pep_match_count": pep_match_count,
            "customer_name": customer_name,
        },
        "computed_at": datetime.now(UTC).isoformat(),
    }

def related_party(exposure_ratio_related_group: float) -> dict:
    if exposure_ratio_related_group < 0:
        return {"error": "exposure_ratio_related_group must not be negative"}
    return {
        "exposure_ratio_related_group": exposure_ratio_related_group,
        "source": "aml-svc",
        "inputs": {"exposure_ratio_related_group": exposure_ratio_related_group},
        "computed_at": datetime.now(UTC).isoformat(),
    }
