from __future__ import annotations

from datetime import UTC, datetime
import json
from functools import lru_cache
from pathlib import Path

from langchain_core.tools import tool

_PROFILE_FIELDS = {
    "customer_id",
    "full_name",
    "id_number",
    "date_of_birth",
    "nationality",
    "address",
    "occupation",
    "income_source",
    "declared_income",
    "customer_type",
    "business_sector",
    "onboarding_date",
    "kyc_risk_level",
    "pep_flag",
    "relationship_to_pep",
    "avatar",
}


def _now() -> str:
    return datetime.now(UTC).isoformat()


@lru_cache
def _load_kyc_dataset() -> dict:
    path = Path(__file__).resolve().parents[1] / "resources" / "compliance" / "kyc_records.json"
    return json.loads(path.read_text(encoding="utf-8"))


@tool
def kyc_check(
    id_number: str,
    consent_granted: bool,
    cccd_verified: bool = False,
    national_id: str | None = None,
) -> dict:
    """Retail KYC check. External KYC service can replace this seeded fallback later."""
    normalized_id = (national_id or id_number or "").strip()
    dataset = _load_kyc_dataset()
    record = dataset.get(normalized_id)
    reasons: list[str] = []
    if not consent_granted:
        reasons.append("missing_data_processing_consent")
    if len(normalized_id) != 12 or not normalized_id.isdigit():
        reasons.append("invalid_cccd_format")
    if not cccd_verified:
        reasons.append("cccd_document_not_verified")
    review_flags: list[str] = []
    if record:
        missing_fields = sorted(_PROFILE_FIELDS - set(record))
        if missing_fields:
            reasons.append("incomplete_customer_profile")
        if record.get("id_number") != normalized_id:
            reasons.append("id_number_mismatch")
        if record.get("kyc_risk_level") == "Cao":
            review_flags.append("enhanced_due_diligence_required")
        if record.get("pep_flag") == "Y":
            review_flags.append("pep_screening_required")
        if record.get("relationship_to_pep"):
            review_flags.append("pep_relationship_review_required")
        if not record.get("avatar"):
            reasons.append("missing_ekyc_avatar")

    status = "passed" if not reasons else "blocked"
    return {
        "status": status,
        "reasons": reasons,
        "id_number": normalized_id,
        "customer_id": record.get("customer_id") if record else None,
        "avatar": record.get("avatar") if record else None,
        "dataset_version": dataset["_meta"]["version"],
        "evidence_id": f"KYC-{normalized_id}" if record else "KYC-INPUT-ONLY",
        "source": "synthetic-kyc-dataset" if record else "application-input",
        "registry_record_found": record is not None,
        "kyc_risk_level": record.get("kyc_risk_level") if record else "unknown",
        "pep_flag": record.get("pep_flag") if record else "unknown",
        "relationship_to_pep": record.get("relationship_to_pep") if record else None,
        "review_flags": review_flags,
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
