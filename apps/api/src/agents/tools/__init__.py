from src.agents.tools.aml import aml_screen, related_party
from src.agents.tools.cic import cic_lookup
from src.agents.tools.income import income_verify, salary_verify, sao_ke_parse
from src.agents.tools.loan_calculator import compute_annual_debt_service, compute_dti, compute_ltv
from src.agents.tools.property import doc_checklist, land_registry, property_valuation
from src.agents.tools.workflow import write_approval_ticket

TOOL_REGISTRY = {
    tool.name: tool
    for tool in [
        aml_screen,
        related_party,
        cic_lookup,
        income_verify,
        salary_verify,
        sao_ke_parse,
        compute_annual_debt_service,
        compute_dti,
        compute_ltv,
        doc_checklist,
        land_registry,
        property_valuation,
        write_approval_ticket,
    ]
}

__all__ = ["TOOL_REGISTRY"]
