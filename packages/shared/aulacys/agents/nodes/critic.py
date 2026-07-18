from __future__ import annotations

from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, CriticVerdict


def _pct(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value * 100:.1f}%"


def _money(value: float | None) -> str:
    if value is None:
        return "—"
    return f"{value:,.0f} ₫".replace(",", ".")


def critic_fallback(state: AgentState, spec: AgentSpec) -> tuple[CriticVerdict, list[str]]:
    """Evidence audit + Vietnamese synthesis memo (base for LLM prose polish)."""
    rejections: list[str] = []
    credit = state.get("credit")
    compliance = state.get("compliance")
    operations = state.get("operations")
    application = state.get("application")
    outcome = ""
    if compliance and compliance.veto:
        outcome = "vetoed"
    elif credit and credit.recommendation == "support":
        outcome = "stp_candidate"
    else:
        outcome = "manual_review_candidate"

    if credit:
        if credit.dti is not None and "compute_dti" not in credit.tool_results:
            rejections.append("DTI xuất hiện nhưng không có bằng chứng tool compute_dti.")
        if credit.proposed_limit is not None and "price_loan" not in credit.tool_results:
            rejections.append("Hạn mức đề nghị không có bằng chứng tool price_loan.")
        if credit.proposed_rate is not None and "price_loan" not in credit.tool_results:
            rejections.append("Lãi suất đề nghị không có bằng chứng tool price_loan.")
    if operations:
        if operations.valuation is not None and "property_valuation" not in operations.tool_results:
            rejections.append("Giá trị TSBĐ không có bằng chứng tool property_valuation.")
    if compliance:
        for violation in compliance.violations:
            if violation.rule_id not in compliance.rule_ids:
                rejections.append(f"Vi phạm {violation.rule_id} thiếu trong rule_ids.")
        if compliance.veto and not compliance.citations:
            rejections.append("Compliance veto nhưng không có citation policy.")
        if "kyc_check" not in compliance.tool_results:
            rejections.append("Thiếu bằng chứng kyc_check.")
        if "ubo_check" not in compliance.tool_results:
            rejections.append("Thiếu bằng chứng ubo_check.")

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

    remediation = rejections or [
        "Người phê duyệt đọc memo Critic + ticket; Critic không phát hiện lỗ hổng bằng chứng.",
        "Đối chiếu rule_ids / DTI / CIC trong tool_results trước khi quyết định cuối.",
    ]

    return CriticVerdict(
        passed=not rejections,
        rejections=rejections,
        memo="\n".join(lines),
        remediation_plan=remediation,
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
    prompt=(
        "Bạn là Critic (tuyến phòng thủ 3). Nhiệm vụ: kiểm chứng bằng chứng và viết "
        "BÁO CÁO TỔNG HỢP bằng tiếng Việt cho người phê duyệt. "
        "Giữ nguyên số liệu/veto đã có trong base — chỉ viết lại memo rõ ràng, có cấu trúc "
        "(kết luận bằng chứng, tóm tắt Credit/Operations/Compliance, đề xuất HITL). "
        "Không bịa số, không đổi recommendation/veto, không sửa output agent khác."
    ),
    fallback=critic_fallback,
    llm_prose=True,
    prose_fields=["memo", "remediation_plan"],
)
