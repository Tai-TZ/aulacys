from __future__ import annotations

from datetime import date

from src.agents.harness.dispatch import dispatch
from src.agents.specs import AgentSpec
from src.agents.state import AgentState, Citation, ComplianceVerdict
from src.policy.client import evaluate_policy


def compliance_fallback(state: AgentState, spec: AgentSpec) -> tuple[ComplianceVerdict, list[str]]:
    app = state["application"]
    declared = app.declared
    operations = state.get("operations")
    limits = (state.get("metadata", {}) or {}).get("product_config", {}).get("limits") or {}
    tool_calls: list[str] = []
    cccd_doc = next((doc for doc in app.documents if doc.kind == "cccd" and doc.extracted), None)
    cccd_verified = bool(cccd_doc and cccd_doc.extracted.get("verified"))
    data_consent = (
        declared.consent_data_processing if declared.consent_data_processing is not None else declared.cic_consent
    )

    kyc = dispatch(
        spec,
        "kyc_check",
        {
            "id_number": declared.id_number,
            "national_id": declared.national_id,
            "consent_granted": bool(data_consent),
            "cccd_verified": cccd_verified,
        },
    )
    tool_calls.append("kyc_check")
    ubo = dispatch(
        spec,
        "ubo_check",
        {
            "is_retail_customer": True,
            "spouse_national_id": declared.spouse_national_id,
            "related_party_flag": False,
        },
    )
    tool_calls.append("ubo_check")

    aml = dispatch(spec, "aml_screen", {"sanctions_match_count": 0, "pep_match_count": 0})
    tool_calls.append("aml_screen")
    related = dispatch(spec, "related_party", {"exposure_ratio_related_group": 0})
    tool_calls.append("related_party")

    metrics: dict[str, float] = {
        "sanctions_match_count": float(aml.get("sanctions_match_count", 0)),
        "pep_match_count": float(aml.get("pep_match_count", 0)),
        "exposure_ratio_related_group": float(related.get("exposure_ratio_related_group", 0)),
        "kyc_verified": 1.0 if kyc.get("status") == "passed" else 0.0,
        "ubo_clear": 1.0 if ubo.get("status") in {"passed", "not_applicable"} else 0.0,
    }
    if state.get("credit") and state["credit"].dti is not None:
        metrics["dti"] = float(state["credit"].dti)
    if operations and operations.valuation:
        ltv = dispatch(spec, "compute_ltv", {"loan_amount": declared.amount, "collateral_value": operations.valuation})
        tool_calls.append("compute_ltv")
        if "ltv" in ltv:
            metrics["ltv"] = float(ltv["ltv"])
            ltv_cap = limits.get("ltv_cap")
            if ltv_cap is not None:
                # Cap lives in product YAML; policy only sees a boolean metric (no if-product in rules).
                metrics["ltv_within_product_cap"] = 1.0 if metrics["ltv"] <= float(ltv_cap) else 0.0

    ceiling = limits.get("amount_ceiling")
    if ceiling is not None:
        metrics["amount_within_product_ceiling"] = 1.0 if float(declared.amount) <= float(ceiling) else 0.0

    purpose_doc = next((doc for doc in app.documents if doc.kind == "purpose_evidence" and doc.extracted), None)
    evidence_purpose = str(purpose_doc.extracted.get("actual_purpose", "")) if purpose_doc else ""
    declared_purpose = declared.declared_purpose.lower()
    if "tất toán" in evidence_purpose.lower() or "tat toan" in evidence_purpose.lower():
        metrics["prohibited_purpose_refinance_other_bank"] = 1
    elif "refinance" in declared_purpose:
        metrics["prohibited_purpose_refinance_other_bank"] = 1

    violations = evaluate_policy(metrics, as_of=date.today())
    return (
        ComplianceVerdict(
            violations=violations,
            veto=any(violation.is_blocking for violation in violations),
            rule_ids=[violation.rule_id for violation in violations],
            kyc_status=str(kyc.get("status", "unknown")),
            ubo_status=str(ubo.get("status", "unknown")),
            citations=[
                Citation(source="policy.evaluate", reference=violation.legal_basis, excerpt=violation.rule_id)
                for violation in violations
            ],
            tool_results={
                "kyc_check": kyc,
                "ubo_check": ubo,
                "aml_screen": aml,
                "related_party": related,
                "metrics": metrics,
            },
        ),
        tool_calls,
    )


ComplianceSpec = AgentSpec(
    name="compliance",
    line=2,
    reads=["application", "credit", "operations"],
    tools=["core_banking_read", "aml_screening"],
    kb="regulation",
    policy="retail_lending.yaml",
    output=ComplianceVerdict,
    model="deterministic-fallback",
    model_tier="mini",
    max_tool_calls=7,
    prompt="Evaluate hard legal and policy limits from YAML only. Veto with rule IDs.",
    fallback=compliance_fallback,
)
