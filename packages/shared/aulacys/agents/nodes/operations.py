from __future__ import annotations

from typing import Any

from aulacys.agents.harness.dispatch import dispatch
from aulacys.agents.harness.permissions import is_tool_allowed
from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, Citation, LoanApplication, OperationsReport


def _product_config(state: AgentState) -> dict[str, Any]:
    return (state.get("metadata", {}) or {}).get("product_config", {}) or {}


def _requires_collateral(app: LoanApplication, config: dict[str, Any]) -> bool:
    if app.declared.collateral_value_declared is not None:
        return True
    limits = config.get("limits") or {}
    if limits.get("ltv_cap") is not None:
        return True
    tools = config.get("tools") or []
    return "property_valuation" in tools or "compute_ltv" in tools


def _parcel_and_registry_inputs(app: LoanApplication) -> tuple[str | None, bool, bool]:
    """Read parcel / dispute / zoning from so_do extract — do not invent legal facts."""
    parcel_id: str | None = None
    has_dispute = False
    zoning_flag = False
    for document in app.documents:
        if document.kind != "so_do" or not document.extracted:
            continue
        extracted = document.extracted
        if extracted.get("parcel"):
            parcel_id = str(extracted["parcel"])
        has_dispute = bool(extracted.get("has_dispute", False))
        zoning_flag = bool(extracted.get("zoning_flag", False))
    return parcel_id, has_dispute, zoning_flag


def _assess_readiness(
    *,
    requires_collateral: bool,
    checklist: dict[str, Any],
    valuation: float | None,
    valuation_task: dict[str, Any],
    registry_result: dict[str, Any],
    valuation_ran: bool,
) -> dict[str, Any]:
    findings: list[str] = []
    checks: dict[str, bool] = {}

    status = str(checklist.get("status", "unknown"))
    missing = list(checklist.get("missing", []))
    checks["docs_complete"] = status == "complete" and not missing
    if not checks["docs_complete"]:
        findings.append(f"documents incomplete: missing={missing or ['unknown']}")

    if requires_collateral:
        checks["collateral_path_required"] = True
        checks["valuation_present"] = isinstance(valuation, int | float) and float(valuation) > 0
        if not checks["valuation_present"]:
            findings.append("collateral path requires property_valuation result")
        checks["valuation_scheduled"] = bool(valuation_task.get("task_id") or valuation_task.get("status"))
        if valuation_ran and not checks["valuation_scheduled"]:
            findings.append("valuation ran without schedule task metadata")
        flags = list(registry_result.get("legal_flags", []))
        checks["land_registry_clear"] = not flags and registry_result.get("clear", not flags) is not False
        if flags:
            findings.append(f"land_registry flags={flags}")
        elif valuation_ran and registry_result.get("error"):
            checks["land_registry_clear"] = False
            findings.append("land_registry returned error")
    else:
        checks["collateral_path_required"] = False
        checks["valuation_present"] = True
        checks["valuation_scheduled"] = True
        checks["land_registry_clear"] = True

    return {
        "checks": checks,
        "findings": findings,
        "requires_collateral": requires_collateral,
        "doc_status": status,
        "missing": missing,
    }


_OPS_CHECK_LABEL_VI: dict[str, str] = {
    "docs_complete": "đủ chứng từ bắt buộc",
    "collateral_valued": "đã định giá TSBĐ",
    "land_clear": "pháp lý đất sạch",
    "valuation_scheduled": "đã lên lịch định giá",
}


def _rationale(*, readiness: dict[str, Any]) -> str:
    """Qualitative prose only — valuation amounts stay in tool_results."""
    checks = readiness.get("checks") or {}
    failed = [name for name, ok in checks.items() if not ok]
    requires = readiness.get("requires_collateral")
    status = readiness.get("doc_status") or "unknown"
    status_vi = {
        "complete": "đầy đủ",
        "incomplete": "thiếu chứng từ",
        "unknown": "chưa xác định",
    }.get(str(status), str(status))
    collateral_vi = "có đường TSBĐ" if requires else "không yêu cầu TSBĐ (tín chấp)"

    lines = [
        "Operations đã kiểm mức độ sẵn sàng hồ sơ và quy trình TSBĐ chỉ bằng tool được phép.",
        f"Trạng thái chứng từ: {status_vi}. {collateral_vi.capitalize()}.",
        "Giá trị định giá (nếu có) nằm trong kết quả tool — không nêu lại con số ở đây.",
        "Operations không quyết định khả năng trả nợ và không đưa ra veto pháp lý.",
    ]
    if failed:
        labels = [_OPS_CHECK_LABEL_VI.get(name, name) for name in failed]
        lines.append("Các điểm chưa đạt: " + "; ".join(labels) + ".")
    else:
        lines.append("Mọi kiểm tra sẵn sàng vận hành đều đạt.")
    return " ".join(lines)

def operations_fallback(state: AgentState, spec: AgentSpec) -> tuple[OperationsReport, list[str]]:
    app = state["application"]
    config = _product_config(state)
    required = (config.get("documents") or {}).get("required", []) or []
    provided = [doc.kind for doc in app.documents]
    declared = app.declared
    requires_collateral = _requires_collateral(app, config)
    parcel_id, has_dispute, zoning_flag = _parcel_and_registry_inputs(app)

    tool_calls: list[str] = []
    checklist = dispatch(spec, "doc_checklist", {"required": required, "provided": provided})
    tool_calls.append("doc_checklist")

    valuation_result: dict[str, Any] = {}
    valuation_task: dict[str, Any] = {}
    registry_result: dict[str, Any] = {"legal_flags": [], "clear": True}
    valuation: float | None = None
    valuation_ran = False

    can_value = requires_collateral and is_tool_allowed(spec.tools, "property_valuation")
    if can_value and declared.collateral_value_declared is not None:
        valuation_task = dispatch(
            spec,
            "schedule_valuation",
            {
                "application_id": (state.get("metadata", {}) or {}).get("application_id", "retail-demo"),
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
        valuation_ran = True
        raw_valuation = valuation_result.get("valuation")
        valuation = float(raw_valuation) if isinstance(raw_valuation, int | float) else None
        registry_result = dispatch(
            spec,
            "land_registry",
            {"has_dispute": has_dispute, "zoning_flag": zoning_flag, "parcel_id": parcel_id},
        )
        tool_calls.append("land_registry")
    elif requires_collateral and declared.collateral_value_declared is None:
        # Secured product without declared collateral — fail closed on valuation.
        valuation_result = {"error": "collateral_value_declared required for secured product path"}
        registry_result = {"legal_flags": [], "clear": False, "error": "skipped_without_collateral_value"}

    readiness = _assess_readiness(
        requires_collateral=requires_collateral,
        checklist=checklist,
        valuation=valuation,
        valuation_task=valuation_task,
        registry_result=registry_result,
        valuation_ran=valuation_ran,
    )

    evidence = [Citation(source="doc_checklist", reference="product required documents")]
    if "schedule_valuation" in tool_calls:
        evidence.append(Citation(source="schedule_valuation", reference="valuation workflow task"))
    if "property_valuation" in tool_calls:
        evidence.append(Citation(source="property_valuation", reference="tool-backed valuation"))
    if "land_registry" in tool_calls:
        evidence.append(Citation(source="land_registry", reference="registry / zoning flags"))
    if not valuation_ran and not requires_collateral:
        evidence.append(Citation(source="doc_checklist", reference="no collateral required for product"))

    return (
        OperationsReport(
            valuation=valuation,
            valuation_task=valuation_task,
            doc_status=str(checklist.get("status", "unknown")),
            missing=list(checklist.get("missing", [])),
            legal_flags=list(registry_result.get("legal_flags", [])),
            rationale=_rationale(readiness=readiness),
            evidence=evidence,
            tool_results={
                "doc_checklist": checklist,
                "schedule_valuation": valuation_task,
                "property_valuation": valuation_result,
                "land_registry": registry_result,
                "operational_readiness": readiness,
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
            "application_id": (state.get("metadata", {}) or {}).get("application_id", "retail-demo"),
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
    prompt=(
        "Kiểm chứng từ và TSBĐ. Định giá chỉ từ tool. "
        "Nếu chỉnh rationale: viết tiếng Việt rõ ràng, định tính; không bịa số định giá hay cờ pháp lý."
    ),
    fallback=operations_fallback,
    llm_prose=True,
    prose_fields=["rationale"],
)
