from __future__ import annotations

from datetime import date

from src.agents.harness.dispatch import dispatch
from src.agents.specs import AgentSpec
from src.agents.state import AgentState, Citation, ComplianceVerdict
from src.agents.tools.loan_calculator import compute_ltv
from src.policy.loader import evaluate


def compliance_fallback(state: AgentState, spec: AgentSpec) -> tuple[ComplianceVerdict, list[str]]:
    app = state["application"]
    declared = app.declared
    operations = state.get("operations")
    tool_calls: list[str] = []

    aml = dispatch(spec, "aml_screen", {"sanctions_match_count": 0, "pep_match_count": 0})
    tool_calls.append("aml_screen")
    related = dispatch(spec, "related_party", {"exposure_ratio_related_group": 0})
    tool_calls.append("related_party")

    metrics: dict[str, float] = {
        "sanctions_match_count": float(aml.get("sanctions_match_count", 0)),
        "pep_match_count": float(aml.get("pep_match_count", 0)),
        "exposure_ratio_related_group": float(related.get("exposure_ratio_related_group", 0)),
    }
    if state.get("credit") and state["credit"].dti is not None:
        metrics["dti"] = float(state["credit"].dti)
    if operations and operations.valuation:
        ltv = compute_ltv.invoke({"loan_amount": declared.amount, "collateral_value": operations.valuation})
        tool_calls.append("compute_ltv")
        if "ltv" in ltv:
            metrics["ltv"] = float(ltv["ltv"])

    purpose_doc = next((doc for doc in app.documents if doc.kind == "purpose_evidence" and doc.extracted), None)
    evidence_purpose = str(purpose_doc.extracted.get("actual_purpose", "")) if purpose_doc else ""
    declared_purpose = declared.declared_purpose.lower()
    if "tất toán" in evidence_purpose.lower() or "tat toan" in evidence_purpose.lower():
        metrics["prohibited_purpose_refinance_other_bank"] = 1
    elif "refinance" in declared_purpose:
        metrics["prohibited_purpose_refinance_other_bank"] = 1

    violations = evaluate(metrics, as_of=date.today())
    return (
        ComplianceVerdict(
            violations=violations,
            veto=any(violation.is_blocking for violation in violations),
            rule_ids=[violation.rule_id for violation in violations],
            citations=[
                Citation(source="policy.evaluate", reference=violation.legal_basis, excerpt=violation.rule_id)
                for violation in violations
            ],
            tool_results={"aml_screen": aml, "related_party": related, "metrics": metrics},
        ),
        tool_calls,
    )


ComplianceSpec = AgentSpec(
    name="compliance",
    line=2,
    reads=["application", "credit", "operations"],
    tools=["aml_screen", "related_party", "compute_ltv"],
    kb="regulation",
    policy="retail_lending.yaml",
    output=ComplianceVerdict,
    model="deterministic-fallback",
    max_tool_calls=5,
    prompt="Evaluate hard legal and policy limits from YAML only. Veto with rule IDs.",
    fallback=compliance_fallback,
)
