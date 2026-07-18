from __future__ import annotations

TOOL_PERMISSION_FACADES: dict[str, set[str]] = {
    # Read-only banking/customer facts and derived read metrics. This facade is broad
    # by design: it mirrors "core banking (read)" in the agent contract, not one svc.
    "core_banking_read": {
        "cic_lookup",
        "income_verify",
        "salary_verify",
        "sao_ke_parse",
        "kyc_check",
        "ubo_check",
        "ekyc_face_match",
        "geo_radius_check",
        "regional_income_check",
        "compute_ltv",
        "doc_checklist",
        "property_valuation",
        "land_registry",
    },
    "loan_calculator": {
        "compute_annual_debt_service",
        "compute_dti",
        "price_loan",
        "age_at_maturity_check",
        "amount_within_income_multiple",
        "term_matches_purpose",
        "dti_within_income_band",
        "disposable_income_buffer",
    },
    "aml_screening": {
        "aml_screen",
        "related_party",
    },
    "workflow_write": {
        "schedule_valuation",
        "write_approval_ticket",
    },
}


def expand_allowed_tools(allowed: list[str]) -> set[str]:
    expanded: set[str] = set()
    for item in allowed:
        expanded.add(item)
        expanded.update(TOOL_PERMISSION_FACADES.get(item, set()))
    return expanded


def is_tool_allowed(allowed: list[str], tool_name: str) -> bool:
    return tool_name in expand_allowed_tools(allowed)
