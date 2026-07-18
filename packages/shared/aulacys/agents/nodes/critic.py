from __future__ import annotations

from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, CriticVerdict


def critic_fallback(state: AgentState, spec: AgentSpec) -> tuple[CriticVerdict, list[str]]:
    rejections: list[str] = []
    credit = state.get("credit")
    compliance = state.get("compliance")
    operations = state.get("operations")

    if credit:
        if credit.dti is not None and "compute_dti" not in credit.tool_results:
            rejections.append("DTI is present without compute_dti tool evidence.")
        if credit.proposed_limit is not None and "price_loan" not in credit.tool_results:
            rejections.append("Proposed credit limit is present without price_loan tool evidence.")
        if credit.proposed_rate is not None and "price_loan" not in credit.tool_results:
            rejections.append("Proposed rate is present without price_loan tool evidence.")
    if operations:
        if operations.valuation is not None and "property_valuation" not in operations.tool_results:
            rejections.append("Valuation is present without property_valuation tool evidence.")
    if compliance:
        for violation in compliance.violations:
            if violation.rule_id not in compliance.rule_ids:
                rejections.append(f"Violation {violation.rule_id} missing from rule_ids.")
        if compliance.veto and not compliance.citations:
            rejections.append("Compliance veto has no citation.")
        if "kyc_check" not in compliance.tool_results:
            rejections.append("Compliance verdict has no kyc_check evidence.")
        if "ubo_check" not in compliance.tool_results:
            rejections.append("Compliance verdict has no ubo_check evidence.")

    memo_parts: list[str] = []
    if credit:
        memo_parts.append(
            "Credit: "
            f"DTI={credit.dti}, income={credit.income:g}, "
            f"limit={credit.proposed_limit}, rate={credit.proposed_rate}, "
            f"recommendation={credit.recommendation}."
        )
    if operations:
        memo_parts.append(
            "Operations: "
            f"docs={operations.doc_status}, valuation={operations.valuation}, "
            f"legal_flags={','.join(operations.legal_flags) or 'none'}."
        )
    if compliance:
        memo_parts.append(
            "Compliance: "
            f"kyc={compliance.kyc_status}, ubo={compliance.ubo_status}, "
            f"veto={compliance.veto}, rules={','.join(compliance.rule_ids) or 'none'}."
        )
    remediation = rejections or [
        "Human approver can review the memo and ticket; no evidence gaps were detected by Critic."
    ]

    return CriticVerdict(
        passed=not rejections, rejections=rejections, memo=" ".join(memo_parts), remediation_plan=remediation
    ), []


CriticSpec = AgentSpec(
    name="critic",
    line=None,
    reads=["application", "credit", "operations", "compliance"],
    tools=[],
    output=CriticVerdict,
    model="deterministic-fallback",
    model_tier="strong",
    max_tool_calls=0,
    prompt="Audit only. Return pass/rejections; never edit agent outputs.",
    fallback=critic_fallback,
    llm_prose=True,
    prose_fields=["memo", "remediation_plan"],
)
