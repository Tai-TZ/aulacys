from __future__ import annotations

from datetime import UTC, datetime

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


@tool
def kyc_check(
    id_number: str,
    consent_granted: bool,
    cccd_verified: bool = False,
    national_id: str | None = None,
) -> dict:
    """Retail KYC check. External KYC service can replace this seeded fallback later."""
    normalized_id = (national_id or id_number or "").strip()
    reasons: list[str] = []
    if not consent_granted:
        reasons.append("missing_data_processing_consent")
    if len(normalized_id) != 12 or not normalized_id.isdigit():
        reasons.append("invalid_cccd_format")
    if not cccd_verified:
        reasons.append("cccd_document_not_verified")

    status = "passed" if not reasons else "blocked"
    return {
        "status": status,
        "reasons": reasons,
        "id_number": normalized_id,
        "inputs": {
            "id_number": id_number,
            "national_id": national_id,
            "consent_granted": consent_granted,
            "cccd_verified": cccd_verified,
        },
        "computed_at": _now(),
    }


@tool
def ubo_check(
    is_retail_customer: bool = True,
    spouse_national_id: str | None = None,
    related_party_flag: bool = False,
) -> dict:
    """UBO/related control check for retail lending."""
    if related_party_flag:
        status = "review"
        reasons = ["related_party_flag"]
    elif is_retail_customer:
        status = "not_applicable"
        reasons = []
    elif not spouse_national_id:
        status = "review"
        reasons = ["ubo_owner_missing"]
    else:
        status = "passed"
        reasons = []

    return {
        "status": status,
        "reasons": reasons,
        "inputs": {
            "is_retail_customer": is_retail_customer,
            "spouse_national_id": spouse_national_id,
            "related_party_flag": related_party_flag,
        },
        "computed_at": _now(),
    }
