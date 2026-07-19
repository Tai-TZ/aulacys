from __future__ import annotations

from typing import Any

from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, CriticVerdict


def _has_tool(tool_results: dict[str, Any] | None, name: str) -> bool:
    return isinstance(tool_results, dict) and name in tool_results


def _pct(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value * 100:.1f}%"


def _money(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value:,.0f} ₫".replace(",", ".")


def critic_fallback(state: AgentState, spec: AgentSpec) -> tuple[CriticVerdict, list[str]]:
    """Evidence audit + Vietnamese synthesis memo (base for LLM remediation polish)."""
    rejections: list[str] = []
    credit = state.get("credit")
    compliance = state.get("compliance")
    operations = state.get("operations")
    application = state.get("application")
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

    outcome = "manual_review_candidate"
    if compliance and compliance.veto:
        outcome = "vetoed"
    elif credit and credit.recommendation == "support":
        outcome = "stp_candidate"

    customer = ""
    product = ""
    amount = None
    if application is not None:
        product = application.product
        customer = application.declared.customer_name
        amount = application.declared.amount

    lines: list[str] = [
        "BÁO CÁO TỔNG HỢP THẨM ĐỊNH (Critic — tuyến 3)",
        f"Khách hàng: {customer or '—'}",
        f"Sản phẩm: {product or '—'}",
        f"Số tiền đề nghị: {_money(float(amount) if amount is not None else None)}",
        "",
        "1) Kết luận kiểm chứng bằng chứng",
        (
            "- Đạt: mọi số liệu/claim quan trọng đều truy được về tool call hoặc policy rule."
            if not rejections
            else "- Chưa đạt: phát hiện lỗ hổng bằng chứng (xem remediation)."
        ),
        "",
        "2) Tóm tắt Credit",
    ]
    if credit:
        lines.extend(
            [
                f"- Khuyến nghị: {credit.recommendation}",
                f"- DTI: {_pct(credit.dti)} · Thu nhập xác minh: {_money(credit.income)}",
                f"- Hạn mức / lãi đề nghị: {_money(credit.proposed_limit)} / {_pct(credit.proposed_rate)}",
                f"- Nhận định Credit: {credit.rationale or '—'}",
            ]
        )
    else:
        lines.append("- Chưa có output Credit.")

    if proposal is not None:
        lines.extend(
            [
                "",
                "2b) LoanProposal",
                f"- Status: {proposal.status} · revisions={len(proposal.revisions)}",
                f"- Limit / rate: {_money(proposal.proposed_limit)} / {_pct(proposal.proposed_rate)}",
            ]
        )

    lines.extend(["", "3) Tóm tắt Operations"])
    if operations:
        lines.extend(
            [
                f"- Chứng từ: {operations.doc_status}"
                + (f" (thiếu: {', '.join(operations.missing)})" if operations.missing else ""),
                f"- Định giá TSBĐ: {_money(operations.valuation if isinstance(operations.valuation, int | float) else None)}",
                f"- Cờ pháp lý: {', '.join(operations.legal_flags) or 'không'}",
                f"- Nhận định Operations: {operations.rationale or '—'}",
            ]
        )
    else:
        lines.append("- Không chạy Operations trong DAG sản phẩm này (hoặc chưa có output).")

    lines.extend(["", "4) Tóm tắt Compliance"])
    if compliance:
        lines.extend(
            [
                f"- Veto: {'CÓ' if compliance.veto else 'không'}",
                f"- Rule chặn/cảnh báo: {', '.join(compliance.rule_ids) or 'không'}",
                f"- KYC / UBO: {compliance.kyc_status} / {compliance.ubo_status}",
                f"- Nhận định Compliance: {compliance.rationale or '—'}",
            ]
        )
    else:
        lines.append("- Chưa có output Compliance.")

    lines.extend(
        [
            "",
            "5) Đề xuất cho người phê duyệt",
            f"- Outcome graph: {outcome or '—'}",
        ]
    )
    if compliance and compliance.veto:
        lines.append(
            "- Hồ sơ bị chặn bởi hạn mức cứng/policy. Không giải ngân STP; "
            "cần HITL hoặc từ chối / điều chỉnh phương án."
        )
    elif credit and credit.recommendation == "support" and not (compliance and compliance.veto):
        lines.append("- Hồ sơ đủ điều kiện theo tool+policy; có thể xem xét STP/phê duyệt theo gate sản phẩm.")
    else:
        lines.append("- Cần thẩm định tay / HITL trước khi giải ngân.")

    if rejections:
        remediation = [
            "Repair evidence gaps before human approval.",
            *[f"Fix: {item}" for item in rejections],
        ]
    else:
        remediation = [
            "Người phê duyệt đọc memo Critic + ticket; Critic không phát hiện lỗ hổng bằng chứng.",
            "Đối chiếu rule_ids / DTI / CIC trong tool_results trước khi quyết định cuối.",
        ]

    return (
        CriticVerdict(
            passed=not rejections,
            rejections=rejections,
            memo="\n".join(lines),
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
        "Bạn là Critic (tuyến phòng thủ 3). Nhiệm vụ: kiểm chứng bằng chứng. "
        "Memo giữ nguyên số liệu từ base — chỉ polish remediation_plan nếu cần, "
        "không bịa số, không đổi recommendation/veto, không sửa output agent khác."
    ),
    fallback=critic_fallback,
    llm_prose=True,
    # Memo keeps tool-backed figures for audit; only remediation prose may be polished.
    prose_fields=["remediation_plan"],
)
