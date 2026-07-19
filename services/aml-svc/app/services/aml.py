from __future__ import annotations
from datetime import UTC, datetime
from app.repositories import seed as repo


def _normalized(value: str | None) -> str:
    return " ".join((value or "").upper().split())


def _matches(records: list[dict], customer_name: str | None) -> list[dict]:
    needle = _normalized(customer_name)
    if not needle:
        return []
    return [
        record
        for record in records
        if needle
        in {
            _normalized(record.get("primary_name")),
            *(_normalized(alias) for alias in record.get("aliases", [])),
        }
    ]


def health_payload() -> dict:
    data = repo.load_seed()
    return {
        "status": "ok",
        "sanctions_records": len(data["sanctions_list"]),
        "pep_records": len(data["pep_list"]),
        "dataset_version": data["_meta"]["version"],
    }


def screen(
    sanctions_match_count: int, pep_match_count: int, customer_name: str | None
) -> dict:
    data = repo.load_seed()
    sanctions_matches = _matches(data["sanctions_list"], customer_name)
    pep_matches = _matches(data["pep_list"], customer_name)
    sanctions_count = sanctions_match_count
    pep_count = pep_match_count
    sanctions_count = max(sanctions_count, len(sanctions_matches))
    pep_count = max(pep_count, len(pep_matches))
    if sanctions_count < 0 or pep_count < 0:
        return {"error": "match counts must not be negative"}
    return {
        "status": "checked",
        "sanctions_match_count": sanctions_count,
        "pep_match_count": pep_count,
        "source": "aml-svc",
        "dataset_version": data["_meta"]["version"],
        "evidence_id": ",".join(
            record["entity_id"] for record in [*sanctions_matches, *pep_matches]
        )
        or "AML-CLEAR",
        "matches": [
            {
                "entity_id": record["entity_id"],
                "primary_name": record["primary_name"],
                "source_url": record["source_url"],
                "source_record_id": record["source_record_id"],
            }
            for record in [*sanctions_matches, *pep_matches]
        ],
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
