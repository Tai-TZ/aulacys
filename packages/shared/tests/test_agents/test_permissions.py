from aulacys.agents.harness.dispatch import dispatch
from aulacys.agents.harness.permissions import expand_allowed_tools
from aulacys.agents.nodes.compliance import ComplianceSpec
from aulacys.agents.nodes.credit import CreditSpec
from aulacys.agents.nodes.operations import OperationsSpec


def test_permission_facades_expand_to_physical_tools():
    assert "price_loan" in expand_allowed_tools(CreditSpec.tools)
    assert "kyc_check" in expand_allowed_tools(ComplianceSpec.tools)
    assert "write_approval_ticket" in expand_allowed_tools(OperationsSpec.tools)


def test_dispatch_rejects_tools_outside_agent_facade():
    assert dispatch(CreditSpec, "aml_screen", {"sanctions_match_count": 0})["error"].startswith("tool 'aml_screen'")
    assert dispatch(ComplianceSpec, "price_loan", {"requested_amount": 1})["error"].startswith("tool 'price_loan'")
    assert dispatch(OperationsSpec, "compute_dti", {"monthly_debt": 1, "monthly_income": 1})["error"].startswith(
        "tool 'compute_dti'"
    )


def test_dispatch_allows_physical_tool_through_facade():
    result = dispatch(
        OperationsSpec,
        "write_approval_ticket",
        {"application_id": "demo", "status": "ready", "summary": "ok"},
    )
    assert result["ticket_id"] == "DEMO-DEMO"
