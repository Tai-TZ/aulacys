from aulacys.agents.tools.aml import aml_screen, related_party
from aulacys.agents.tools.appraisal import (
    age_at_maturity_check,
    amount_within_income_multiple,
    disposable_income_buffer,
    dti_within_income_band,
    term_matches_purpose,
)
from aulacys.agents.tools.cic import cic_lookup
from aulacys.agents.tools.ekyc import ekyc_face_match
from aulacys.agents.tools.geo import geo_radius_check
from aulacys.agents.tools.income import income_verify, salary_verify, sao_ke_parse
from aulacys.agents.tools.kyc import kyc_check, ubo_check
from aulacys.agents.tools.loan_calculator import compute_annual_debt_service, compute_dti, compute_ltv
from aulacys.agents.tools.pricing import price_loan
from aulacys.agents.tools.property import doc_checklist, land_registry, property_valuation, schedule_valuation
from aulacys.agents.tools.regional_income import regional_income_check
from aulacys.agents.tools.workflow import write_approval_ticket

TOOL_REGISTRY = {
    tool.name: tool
    for tool in [
        aml_screen,
        related_party,
        age_at_maturity_check,
        amount_within_income_multiple,
        disposable_income_buffer,
        dti_within_income_band,
        term_matches_purpose,
        cic_lookup,
        ekyc_face_match,
        geo_radius_check,
        income_verify,
        salary_verify,
        sao_ke_parse,
        kyc_check,
        ubo_check,
        regional_income_check,
        compute_annual_debt_service,
        compute_dti,
        compute_ltv,
        price_loan,
        schedule_valuation,
        doc_checklist,
        land_registry,
        property_valuation,
        write_approval_ticket,
    ]
}

__all__ = ["TOOL_REGISTRY"]
