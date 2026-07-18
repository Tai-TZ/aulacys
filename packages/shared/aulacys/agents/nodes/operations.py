from __future__ import annotations

from aulacys.agents.harness.dispatch import dispatch
from aulacys.agents.harness.permissions import is_tool_allowed
from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, Citation, OperationsReport


def operations_fallback(state: AgentState, spec: AgentSpec) -> tuple[OperationsReport, list[str]]:
    app = state["application"]
    config = state.get("metadata", {}).get("product_config", {})
    required = config.get("documents", {}).get("required", [])
    provided = [doc.kind for doc in app.documents]
    declared = app.declared

    parcel_id = None
    for document in app.documents:
        if document.kind == "so_do" and document.extracted:
            parcel_id = document.extracted.get("parcel")
            break

    tool_calls: list[str] = []
    checklist = dispatch(spec, "doc_checklist", {"required": required, "provided": provided})
    tool_calls.append("doc_checklist")

    valuation_result: dict = {}
    valuation_task: dict = {}
    registry_result: dict = {"legal_flags": []}
    valuation: float | None = None
    if declared.collateral_value_declared is not None and is_tool_allowed(spec.tools, "property_valuation"):
        valuation_task = dispatch(
            spec,
            "schedule_valuation",
            {
                "application_id": state.get("metadata", {}).get("application_id", "retail-demo"),
                "parcel_id": parcel_id,
            },
        )
        tool_calls.append("schedule_valuation")
        valuation_result = dispatch(
            spec,
            "property_valuation",
            {"collateral_value": declared.collateral_value_declared, "parcel_id": parcel_id},
        )
        tool_calls.append("property_valuation")
        valuation = valuation_result.get("valuation")
        registry_result = dispatch(
            spec,
            "land_registry",
            {"has_dispute": False, "zoning_flag": False, "parcel_id": parcel_id},
        )
        tool_calls.append("land_registry")

    return (
        OperationsReport(
            valuation=valuation if isinstance(valuation, int | float) else None,
            valuation_task=valuation_task,
            doc_status=str(checklist.get("status", "unknown")),
            missing=list(checklist.get("missing", [])),
            legal_flags=list(registry_result.get("legal_flags", [])),
            evidence=[
                Citation(source="doc_checklist", reference="product required documents"),
                Citation(source="property_valuation", reference="seeded valuation")
                if valuation
                else Citation(source="doc_checklist", reference="no collateral required"),
            ],
            tool_results={
                "doc_checklist": checklist,
                "schedule_valuation": valuation_task,
                "property_valuation": valuation_result,
                "land_registry": registry_result,
            },
        ),
        tool_calls,
    )


def write_outcome_ticket(state: AgentState, outcome: str) -> dict:
    """Operations owns workflow writes; graph only decides when to request one."""
    compliance = state.get("compliance")
    rule_ids = ", ".join(compliance.rule_ids) if compliance else "none"
    summary = f"{state['application'].product}: {outcome}; rules={rule_ids}"
    return dispatch(
        OperationsSpec,
        "write_approval_ticket",
        {
            "application_id": state.get("metadata", {}).get("application_id", "retail-demo"),
            "status": outcome,
            "summary": summary,
        },
    )


OperationsSpec = AgentSpec(
    name="operations",
    line=1,
    reads=["application", "metadata"],
    tools=["core_banking_read", "workflow_write"],
    kb="collateral",
    output=OperationsReport,
    model="deterministic-fallback",
    model_tier="mini",
    max_tool_calls=6,
    prompt="Check documents and collateral. Valuation must come from tools only.",
    fallback=operations_fallback,
)
