from __future__ import annotations

from typing import Any

from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, CriticVerdict


def _has_tool(tool_results: dict[str, Any] | None, name: str) -> bool:
    return isinstance(tool_results, dict) and name in tool_results


def critic_fallback(state: AgentState, spec: AgentSpec) -> tuple[CriticVerdict, list[str]]:
    """Audit evidence only — never mutate Credit/Ops/Compliance outputs."""
    rejections: list[str] = []
    credit = state.get("credit")
    compliance = state.get("compliance")
    operations = state.get("operations")
    proposal = state.get("proposal") or (credit.proposal if credit else None)

    if credit:
        tools = credit.tool_results or {}
        if credit.dti is not None and not _has_tool(tools, "compute_dti"):
            rejections.append("DTI is present without compute_dti tool evidence.")
        if credit.proposed_limit is not None and not _has_tool(tools, "price_loan"):
            rejections.append("Proposed credit limit is present without price_loan tool evidence.")
        if credit.proposed_rate is not None and not _has_tool(tools, "price_loan"):
            rejections.append("Proposed rate is present without price_loan tool evidence.")
        if credit.income is not None and not (_has_tool(tools, "income_verify") or _has_tool(tools, "salary_verify")):
            rejections.append("Income is present without income_verify/salary_verify tool evidence.")
        if not _has_tool(tools, "cic_lookup"):
            rejections.append("Credit assessment lacks cic_lookup tool evidence.")
        annual = tools.get("compute_annual_debt_service") if isinstance(tools, dict) else None
        if isinstance(annual, dict) and annual.get("monthly_payment") is None and "error" not in annual:
            rejections.append("compute_annual_debt_service ran without monthly_payment.")

    if proposal is not None:
        if proposal.dti is not None and credit is not None and proposal.dti != credit.dti:
            rejections.append("LoanProposal.dti does not match CreditAssessment.dti.")
        if (
            proposal.proposed_limit is not None
            and credit is not None
            and credit.proposed_limit is not None
            and proposal.proposed_limit != credit.proposed_limit
        ):
            rejections.append("LoanProposal.proposed_limit does not match CreditAssessment.proposed_limit.")
        if proposal.monthly_payment is not None and credit is not None:
            annual = (credit.tool_results or {}).get("compute_annual_debt_service")
            tool_payment = annual.get("monthly_payment") if isinstance(annual, dict) else None
            if tool_payment is not None and float(tool_payment) != float(proposal.monthly_payment):
                rejections.append("LoanProposal.monthly_payment is not backed by compute_annual_debt_service.")
        if proposal.status not in {"accepted", "revised", "rejected"}:
            rejections.append(f"LoanProposal.status is invalid: {proposal.status}")

    if operations:
        tools = operations.tool_results or {}
        if operations.valuation is not None and not _has_tool(tools, "property_valuation"):
            rejections.append("Valuation is present without property_valuation tool evidence.")
        if operations.legal_flags and not _has_tool(tools, "land_registry"):
            rejections.append("legal_flags are present without land_registry tool evidence.")
        if operations.doc_status and not _has_tool(tools, "doc_checklist"):
            rejections.append("doc_status is present without doc_checklist tool evidence.")

    if compliance:
        tools = compliance.tool_results or {}
        for violation in compliance.violations:
            if violation.rule_id not in compliance.rule_ids:
                rejections.append(f"Violation {violation.rule_id} missing from rule_ids.")
        if compliance.veto and not compliance.citations:
            rejections.append("Compliance veto has no citation.")
        if compliance.veto and not any(
            getattr(c, "source", "") == "policy.evaluate" for c in (compliance.citations or [])
        ):
            rejections.append("Compliance veto citations must include policy.evaluate.")
        if not _has_tool(tools, "kyc_check"):
            rejections.append("Compliance verdict has no kyc_check evidence.")
        if not _has_tool(tools, "ubo_check"):
            rejections.append("Compliance verdict has no ubo_check evidence.")
        if compliance.veto and not _has_tool(tools, "metrics"):
            rejections.append("Compliance veto has no metrics package for audit replay.")

    # Deterministic memo keeps figures for audit; LLM may only polish remediation_plan.
    memo_parts: list[str] = []
    if credit:
        memo_parts.append(
            "Credit: "
            f"DTI={credit.dti}, income={credit.income:g}, "
            f"limit={credit.proposed_limit}, rate={credit.proposed_rate}, "
            f"recommendation={credit.recommendation}."
        )
    if proposal is not None:
        memo_parts.append(f"Proposal: status={proposal.status}, revisions={len(proposal.revisions)}.")
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

    if rejections:
        remediation = [
            "Repair evidence gaps before human approval.",
            *[f"Fix: {item}" for item in rejections],
        ]
    else:
        remediation = ["Human approver can review the memo and ticket; no evidence gaps were detected by Critic."]

    return (
        CriticVerdict(
            passed=not rejections,
            rejections=rejections,
            memo=" ".join(memo_parts),
            remediation_plan=remediation,
        ),
        [],
    )


CriticSpec = AgentSpec(
    name="critic",
    line=None,
    reads=["application", "credit", "operations", "compliance", "proposal"],
    tools=[],
    output=CriticVerdict,
    model="deterministic-fallback",
    model_tier="strong",
    max_tool_calls=0,
    prompt=(
        "Audit only. Return pass/rejections; never edit agent outputs. "
        "If refining remediation_plan, keep it actionable and do not invent numbers or flip passed."
    ),
    fallback=critic_fallback,
    llm_prose=True,
    # Memo keeps tool-backed figures for audit; only remediation prose may be polished.
    prose_fields=["remediation_plan"],
)
