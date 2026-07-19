from __future__ import annotations

from typing import Any

from aulacys.agents.harness.dispatch import dispatch
from aulacys.agents.harness.permissions import is_tool_allowed
from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, Citation, CreditAssessment, Document, LoanApplication, LoanProposal


def _money(value: float | int | None) -> str:
    if value is None:
        return "unknown"
    return f"{float(value):,.0f} VND"


def _build_loan_proposal(
    *,
    requested_amount: float,
    declared_rate: float,
    term_months: int,
    monthly_payment: float | None,
    dti: float | None,
    pricing: dict,
    recommendation: str,
    consent_blocked: bool,
) -> LoanProposal:
    proposed_limit = (
        float(pricing["proposed_limit"]) if isinstance(pricing.get("proposed_limit"), int | float) else None
    )
    proposed_rate = float(pricing["proposed_rate"]) if isinstance(pricing.get("proposed_rate"), int | float) else None
    price_decision = str(pricing.get("decision", ""))
    revisions: list[str] = []

    if consent_blocked:
        revisions.append("CIC consent is required before Credit can price the proposal.")
    if price_decision == "decline_or_manual_review":
        revisions.append("Proposal is not priceable by deterministic pricing tools.")
    if proposed_limit is not None and proposed_limit < requested_amount:
        revisions.append(
            f"Limit reduced from {_money(requested_amount)} to {_money(proposed_limit)} due to DTI/income/CIC pricing."
        )
    if proposed_rate is not None and abs(proposed_rate - declared_rate) > 0.0001:
        revisions.append(f"Rate revised from {declared_rate:.2%} to {proposed_rate:.2%} by product pricing config.")
    if dti is None:
        revisions.append("DTI is unavailable because required debt/income evidence is incomplete.")

    if consent_blocked or price_decision == "decline_or_manual_review":
        status = "rejected"
    elif recommendation == "support" and not revisions:
        status = "accepted"
    else:
        status = "revised"

    return LoanProposal(
        requested_amount=requested_amount,
        proposed_limit=proposed_limit,
        proposed_rate=proposed_rate,
        term_months=term_months,
        monthly_payment=monthly_payment,
        dti=dti,
        status=status,
        revisions=revisions,
    )


def _product_config(state: AgentState) -> dict[str, Any]:
    return (state.get("metadata", {}) or {}).get("product_config", {}) or {}


def _statement_monthly_income(app: LoanApplication) -> float:
    for doc in app.documents:
        if doc.kind in {"sao_ke_luong", "sao_ke_tai_khoan"} and doc.extracted:
            income = doc.extracted.get("monthly_income")
            if isinstance(income, int | float) and income > 0:
                return float(income)
    return float(app.declared.monthly_income)


def _resolve_cccd(app: LoanApplication) -> str:
    """Prefer explicit national_id / CCCD doc over DeclaredForm.id_number default."""
    declared = app.declared
    if declared.national_id:
        return str(declared.national_id)
    for doc in app.documents:
        if doc.kind == "cccd" and doc.extracted:
            extracted_id = doc.extracted.get("id_number") or doc.extracted.get("national_id")
            if extracted_id:
                return str(extracted_id)
    return declared.id_number


def _cic_consent(app: LoanApplication) -> bool:
    """CIC inquiry requires cic_consent; general data consent cannot override a CIC denial."""
    declared = app.declared
    if not bool(declared.cic_consent):
        return False
    if declared.consent_data_processing is False:
        return False
    return True


def _income_tool_name(spec: AgentSpec, documents: list[Document]) -> str:
    preferred = "salary_verify" if any(doc.kind == "sao_ke_luong" for doc in documents) else "income_verify"
    if is_tool_allowed(spec.tools, preferred):
        return preferred
    return "income_verify"


def _term_months_max(config: dict[str, Any]) -> int | None:
    limits = config.get("limits") or {}
    if limits.get("term_months_max") is not None:
        return int(limits["term_months_max"])
    if limits.get("term_years_max") is not None:
        return int(limits["term_years_max"]) * 12
    return None


def _amount_ceiling(config: dict[str, Any]) -> float | None:
    limits = config.get("limits") or {}
    if limits.get("amount_ceiling") is None:
        return None
    return float(limits["amount_ceiling"])


def _max_dti(config: dict[str, Any]) -> float | None:
    pricing = config.get("pricing") or {}
    if pricing.get("max_dti") is None:
        return None
    return float(pricing["max_dti"])


def _max_cic_group(config: dict[str, Any]) -> int | None:
    """Optional product appetite only — do not invent a statutory CIC cap here."""
    pricing = config.get("pricing") or {}
    limits = config.get("limits") or {}
    if pricing.get("max_cic_group") is not None:
        return int(pricing["max_cic_group"])
    if limits.get("max_cic_group") is not None:
        return int(limits["max_cic_group"])
    return None


def _cic_group_for_pricing(cic: dict[str, Any]) -> int:
    """Fail closed into price_loan: invalid/missing/consent group must not look like group 1."""
    consent_blocked = cic.get("error") == "consent_required" or bool(cic.get("consent_required"))
    raw = cic.get("cic_group")
    try:
        group = int(raw) if raw is not None else None
    except (TypeError, ValueError):
        group = None
    if consent_blocked or group is None or group < 1:
        return 5
    return group


def _assess_reasonableness(
    *,
    app: LoanApplication,
    config: dict[str, Any],
    dti: float | None,
    cic: dict[str, Any],
    pricing: dict[str, Any],
    monthly_payment: float | None,
) -> dict[str, Any]:
    """Deterministic proposal checks. Numbers come from tools/config only."""
    declared = app.declared
    findings: list[str] = []
    checks: dict[str, bool] = {}

    term_max = _term_months_max(config)
    if term_max is None:
        checks["term_within_product_max"] = False
        findings.append("product term limit missing (term_months_max / term_years_max); fail closed")
    else:
        ok = declared.term_months <= term_max
        checks["term_within_product_max"] = ok
        if not ok:
            findings.append(f"term_months {declared.term_months} exceeds product max {term_max}")

    ceiling = _amount_ceiling(config)
    if ceiling is None:
        # Secured products may omit a cash ceiling; skip rather than invent one.
        checks["amount_within_ceiling"] = True
        checks["amount_ceiling_configured"] = False
    else:
        checks["amount_ceiling_configured"] = True
        ok = declared.amount <= ceiling
        checks["amount_within_ceiling"] = ok
        if not ok:
            findings.append(f"requested amount {declared.amount} exceeds product ceiling {ceiling}")

    proposed_limit = pricing.get("proposed_limit")
    if isinstance(proposed_limit, int | float):
        ok = declared.amount <= float(proposed_limit)
        checks["amount_within_proposed_limit"] = ok
        if not ok:
            findings.append(f"requested amount {declared.amount} exceeds tool proposed_limit {proposed_limit}")
    else:
        checks["amount_within_proposed_limit"] = False
        findings.append("proposed_limit missing from price_loan")

    pricing_cfg = config.get("pricing") or {}
    min_rate = pricing_cfg.get("min_rate")
    max_rate = pricing_cfg.get("max_rate")
    proposed_rate = pricing.get("proposed_rate")
    if min_rate is None or max_rate is None:
        checks["rate_within_product_band"] = False
        findings.append("product rate band missing (min_rate / max_rate); fail closed")
    else:
        ok = float(min_rate) <= declared.annual_rate <= float(max_rate)
        checks["rate_within_product_band"] = ok
        if not ok:
            findings.append(f"annual_rate {declared.annual_rate} outside product band [{min_rate}, {max_rate}]")

    if isinstance(proposed_rate, int | float):
        checks["proposed_rate_available"] = True
        if min_rate is not None and max_rate is not None:
            tool_ok = float(min_rate) <= float(proposed_rate) <= float(max_rate)
            checks["proposed_rate_within_band"] = tool_ok
            if not tool_ok:
                findings.append(f"tool proposed_rate {proposed_rate} outside product band [{min_rate}, {max_rate}]")
        else:
            checks["proposed_rate_within_band"] = False
    else:
        checks["proposed_rate_available"] = False
        checks["proposed_rate_within_band"] = False
        findings.append("proposed_rate missing from price_loan")

    max_dti = _max_dti(config)
    checks["max_dti_configured"] = max_dti is not None
    if max_dti is None:
        checks["dti_within_max"] = False
        findings.append("product pricing.max_dti missing; fail closed")
    elif isinstance(dti, int | float):
        ok = float(dti) <= max_dti
        checks["dti_within_max"] = ok
        if not ok:
            findings.append(f"DTI {dti} exceeds product max_dti {max_dti}")
    else:
        checks["dti_within_max"] = False
        findings.append("DTI unavailable; fail closed on repayment capacity")

    max_overdue = int(cic.get("max_overdue_days") or cic.get("overdue_days") or 0)
    has_bad_debt = bool(cic.get("has_bad_debt", False))
    try:
        cic_group = int(cic["cic_group"]) if cic.get("cic_group") is not None else 0
    except (TypeError, ValueError):
        cic_group = 0
    consent_blocked = cic.get("error") == "consent_required" or bool(cic.get("consent_required"))
    checks["cic_consent_ok"] = not consent_blocked
    max_cic = _max_cic_group(config)
    group_ok = cic_group >= 1 and (max_cic is None or cic_group <= max_cic)
    checks["cic_clean"] = (not consent_blocked) and group_ok and max_overdue == 0 and not has_bad_debt
    if consent_blocked:
        findings.append("CIC consent required before bureau lookup")
    elif not checks["cic_clean"]:
        cap_note = f" max_cic_group={max_cic}" if max_cic is not None else ""
        findings.append(
            f"CIC not clean: group={cic_group} overdue_days={max_overdue} bad_debt={has_bad_debt}{cap_note}"
        )

    decision = str(pricing.get("decision") or "")
    checks["pricing_full_support"] = decision == "priceable"
    if decision and decision != "priceable":
        findings.append(f"price_loan decision={decision}")

    if monthly_payment is not None:
        checks["monthly_payment_computed"] = True
    else:
        checks["monthly_payment_computed"] = False
        findings.append("monthly payment missing from compute_annual_debt_service")

    return {
        "checks": checks,
        "findings": findings,
        "max_dti": max_dti,
        "term_months_max": term_max,
        "amount_ceiling": ceiling,
        "max_cic_group": max_cic,
        "pricing_decision": decision,
        "monthly_payment": monthly_payment,
    }


def _recommendation(reasonableness: dict[str, Any]) -> str:
    checks = reasonableness.get("checks") or {}
    required = (
        "term_within_product_max",
        "amount_within_ceiling",
        "amount_within_proposed_limit",
        "rate_within_product_band",
        "proposed_rate_available",
        "proposed_rate_within_band",
        "max_dti_configured",
        "dti_within_max",
        "cic_clean",
        "cic_consent_ok",
        "pricing_full_support",
        "monthly_payment_computed",
    )
    if all(checks.get(name, False) for name in required):
        return "support"

    hard_fail = (
        "cic_consent_ok",
        "dti_within_max",
        "cic_clean",
        "pricing_full_support",
        "amount_within_proposed_limit",
        "monthly_payment_computed",
        "max_dti_configured",
        "proposed_rate_available",
    )
    if any(not checks.get(name, False) for name in hard_fail):
        return "manual_review"
    return "review"


_CHECK_LABEL_VI: dict[str, str] = {
    "term_within_product_max": "kỳ hạn trong giới hạn sản phẩm",
    "amount_ceiling_configured": "đã cấu hình trần số tiền",
    "amount_within_ceiling": "số tiền xin vay trong trần sản phẩm",
    "amount_within_proposed_limit": "số tiền xin vay trong hạn mức định giá",
    "rate_within_product_band": "lãi suất khai báo trong khung sản phẩm",
    "proposed_rate_available": "đã có lãi suất đề xuất từ tool định giá",
    "proposed_rate_within_band": "lãi suất đề xuất trong khung sản phẩm",
    "max_dti_configured": "đã cấu hình DTI tối đa",
    "dti_within_max": "DTI trong hạn mức cho phép",
    "cic_consent_ok": "đã có đồng ý tra CIC",
    "cic_clean": "lịch sử tín dụng CIC đạt (không nợ xấu / quá hạn / nhóm nợ vượt ngưỡng)",
    "pricing_full_support": "tool định giá hỗ trợ đủ phương án",
    "monthly_payment_computed": "đã tính được khoản trả hàng tháng",
}

_REC_LABEL_VI: dict[str, str] = {
    "support": "ủng hộ phương án",
    "manual_review": "cần thẩm định tay / HITL",
    "review": "cần xem xét thêm",
    "reject": "không hỗ trợ phương án",
}


def _rationale(
    *,
    recommendation: str,
    reasonableness: dict[str, Any],
) -> str:
    """Qualitative prose only — figures stay in tool_results so LLM polish cannot rewrite them."""
    checks = reasonableness.get("checks") or {}
    failed = [name for name, ok in checks.items() if not ok]
    decision = str(reasonableness.get("pricing_decision") or "unknown")
    rec_vi = _REC_LABEL_VI.get(recommendation, recommendation)
    price_vi = {
        "priceable": "có thể định giá",
        "decline_or_manual_review": "không định giá được / cần xem xét thủ công",
    }.get(decision, decision)

    lines = [
        "Credit đã kiểm tính hợp lý của phương án vay chỉ bằng các công cụ được phép "
        "(CIC, thu nhập, DTI, định giá).",
        f"Khuyến nghị: {rec_vi}. Kết quả định giá: {price_vi}.",
        "Các số liệu DTI, khoản trả, hạn mức và lãi suất nằm trong kết quả tool — "
        "không nêu lại con số trong nhận định này.",
        "Credit không phê duyệt khoản vay, không veto pháp lý và không tự bịa số liệu.",
    ]
    if failed:
        labels = [_CHECK_LABEL_VI.get(name, name) for name in failed]
        lines.append("Các điểm chưa đạt cần lưu ý: " + "; ".join(labels) + ".")
        if "cic_clean" in failed:
            lines.append(
                "Đặc biệt về CIC: lịch sử tín dụng chưa đạt điều kiện sạch "
                "(có dấu hiệu quá hạn, nhóm nợ cần chú ý, hoặc nợ xấu). "
                "Cần đối chiếu báo cáo CIC đầy đủ trước khi đề xuất phương án cuối."
            )
    else:
        lines.append("Mọi kiểm tra hợp lý của phương án đều đạt.")
    return " ".join(lines)

def credit_fallback(state: AgentState, spec: AgentSpec) -> tuple[CreditAssessment, list[str]]:
    app = state["application"]
    declared = app.declared
    config = _product_config(state)
    statement_income = _statement_monthly_income(app)
    cccd = _resolve_cccd(app)

    tool_calls: list[str] = []
    cic = dispatch(
        spec,
        "cic_lookup",
        {"cccd": cccd, "consent_granted": _cic_consent(app)},
    )
    tool_calls.append("cic_lookup")

    income_tool = _income_tool_name(spec, app.documents)
    income = dispatch(
        spec,
        income_tool,
        {
            "declared_monthly_income": declared.monthly_income,
            "statement_monthly_income": statement_income,
        },
    )
    tool_calls.append(income_tool)

    annual_service = dispatch(
        spec,
        "compute_annual_debt_service",
        {
            "principal": declared.amount,
            "annual_rate": declared.annual_rate,
            "term_months": declared.term_months,
        },
    )
    tool_calls.append("compute_annual_debt_service")

    verified_income = float(income.get("verified_monthly_income", declared.monthly_income))
    monthly_payment_raw = annual_service.get("monthly_payment")
    proposed_monthly = float(monthly_payment_raw) if isinstance(monthly_payment_raw, int | float) else None
    cic_outstanding = float(cic.get("total_outstanding_vnd") or 0)
    cic_monthly_debt = cic.get("monthly_debt_obligation_vnd")
    if cic_outstanding > 0 and cic_monthly_debt is None:
        # Outstanding principal cannot be converted to a monthly obligation without
        # schedule/rate data. Do not guess: omit DTI so policy fails closed.
        dti_result: dict[str, Any] = {
            "error": "CIC monthly debt obligation is required when outstanding debt is positive",
            "inputs": {
                "cic_total_outstanding_vnd": cic_outstanding,
                "proposed_monthly_payment": proposed_monthly,
                "monthly_income": verified_income,
            },
        }
    else:
        existing_monthly_debt = max(
            declared.existing_monthly_debt,
            float(cic_monthly_debt) if cic_monthly_debt is not None else 0.0,
        )
        dti_result = dispatch(
            spec,
            "compute_dti",
            {
                "monthly_debt": existing_monthly_debt + float(proposed_monthly or 0),
                "monthly_income": verified_income,
            },
        )
        tool_calls.append("compute_dti")

    dti = dti_result.get("dti") if isinstance(dti_result.get("dti"), int | float) else None
    has_bad_debt = bool(cic.get("has_bad_debt", False))
    cic_group = _cic_group_for_pricing(cic)
    pricing = dispatch(
        spec,
        "price_loan",
        {
            "requested_amount": declared.amount,
            "term_months": declared.term_months,
            "verified_monthly_income": verified_income,
            "dti": dti,
            "cic_group": cic_group,
            "has_bad_debt": has_bad_debt,
            "pricing": config.get("pricing", {}),
        },
    )
    tool_calls.append("price_loan")

    reasonableness = _assess_reasonableness(
        app=app,
        config=config,
        dti=dti,
        cic=cic,
        pricing=pricing,
        monthly_payment=proposed_monthly,
    )
    recommendation = _recommendation(reasonableness)
    consent_blocked = cic.get("error") == "consent_required" or bool(cic.get("consent_required"))

    evidence = [
        Citation(source="cic_lookup", reference="CIC bureau lookup"),
        Citation(source=income_tool, reference="verified income / salary statement"),
        Citation(source="compute_annual_debt_service", reference="deterministic annuity payment"),
    ]
    if "compute_dti" in tool_calls:
        evidence.append(Citation(source="compute_dti", reference="deterministic tool result"))
    evidence.append(Citation(source="price_loan", reference="product pricing config"))

    # Keep income_verify alias so Compliance/Critic readers stay stable when salary_verify ran.
    tool_results: dict[str, Any] = {
        "cic_lookup": cic,
        income_tool: income,
        "income_verify": income,
        "compute_annual_debt_service": annual_service,
        "compute_dti": dti_result,
        "price_loan": pricing,
        "proposal_reasonableness": reasonableness,
    }

    proposal = _build_loan_proposal(
        requested_amount=float(declared.amount),
        declared_rate=float(declared.annual_rate),
        term_months=int(declared.term_months),
        monthly_payment=proposed_monthly,
        dti=dti,
        pricing=pricing,
        recommendation=recommendation,
        consent_blocked=consent_blocked,
    )

    return (
        CreditAssessment(
            dti=dti,
            income=verified_income,
            proposed_limit=pricing.get("proposed_limit")
            if isinstance(pricing.get("proposed_limit"), int | float)
            else None,
            proposed_rate=pricing.get("proposed_rate")
            if isinstance(pricing.get("proposed_rate"), int | float)
            else None,
            recommendation=recommendation,
            rationale=_rationale(recommendation=recommendation, reasonableness=reasonableness),
            evidence=evidence,
            tool_results=tool_results,
            proposal=proposal,
        ),
        tool_calls,
    )


CreditSpec = AgentSpec(
    name="credit",
    line=1,
    reads=["application", "metadata"],
    tools=["core_banking_read", "loan_calculator"],
    kb="retail_lending",
    policy="retail_lending.yaml",
    output=CreditAssessment,
    model="deterministic-fallback",
    model_tier="mini",
    max_tool_calls=7,
    prompt=(
        "Kiểm phương án vay có hợp lý về tài chính. Chỉ dùng số từ tool (CIC, thu nhập, DTI, "
        "khoản trả, hạn mức, lãi). Không phê duyệt, không veto, không bịa số. "
        "Nếu chỉnh rationale: viết tiếng Việt rõ ràng, định tính; không nhắc lại con số cụ thể."
    ),
    fallback=credit_fallback,
    llm_prose=True,
    prose_fields=["rationale"],
)
