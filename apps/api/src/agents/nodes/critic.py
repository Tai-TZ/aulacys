from __future__ import annotations

from src.agents.specs import AgentSpec
from src.agents.state import AgentState, CriticVerdict


def critic_fallback(state: AgentState, spec: AgentSpec) -> tuple[CriticVerdict, list[str]]:
    rejections: list[str] = []
    credit = state.get("credit")
    compliance = state.get("compliance")

    if credit and credit.dti is not None and "compute_dti" not in credit.tool_results:
        rejections.append("DTI is present without compute_dti tool evidence.")
    if compliance:
        for violation in compliance.violations:
            if violation.rule_id not in compliance.rule_ids:
                rejections.append(f"Violation {violation.rule_id} missing from rule_ids.")
        if compliance.veto and not compliance.citations:
            rejections.append("Compliance veto has no citation.")

    return CriticVerdict(passed=not rejections, rejections=rejections), []


CriticSpec = AgentSpec(
    name="critic",
    line=None,
    reads=["application", "credit", "operations", "compliance"],
    tools=[],
    output=CriticVerdict,
    model="deterministic-fallback",
    max_tool_calls=0,
    prompt="Audit only. Return pass/rejections; never edit agent outputs.",
    fallback=critic_fallback,
)
