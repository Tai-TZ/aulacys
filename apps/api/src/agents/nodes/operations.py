from __future__ import annotations

from src.agents.harness.dispatch import dispatch
from src.agents.specs import AgentSpec
from src.agents.state import AgentState, Citation, OperationsReport


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
    registry_result: dict = {"legal_flags": []}
    valuation: float | None = None
    if declared.collateral_value_declared is not None and "property_valuation" in spec.tools:
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
                "property_valuation": valuation_result,
                "land_registry": registry_result,
            },
        ),
        tool_calls,
    )


OperationsSpec = AgentSpec(
    name="operations",
    line=1,
    reads=["application", "metadata"],
    tools=["property_valuation", "land_registry", "doc_checklist"],
    kb="collateral",
    output=OperationsReport,
    model="deterministic-fallback",
    max_tool_calls=5,
    prompt="Check documents and collateral. Valuation must come from tools only.",
    fallback=operations_fallback,
)
