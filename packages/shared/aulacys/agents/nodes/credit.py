from __future__ import annotations

from aulacys.agents.harness.dispatch import dispatch
from aulacys.agents.harness.permissions import is_tool_allowed
from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, Citation, CreditAssessment
from aulacys.agents.tools.appraisal import dti_cap_for_income


def credit_fallback(state: AgentState, spec: AgentSpec) -> tuple[CreditAssessment, list[str]]:
    app = state["application"]
    declared = app.declared
    config = state.get("metadata", {}).get("product_config", {}) or {}
    statement_income = next(
        (
            doc.extracted.get("monthly_income")
            for doc in app.documents
            if doc.kind in {"sao_ke_luong", "sao_ke_tai_khoan"} and doc.extracted
        ),
        declared.monthly_income,
    )

    tool_calls: list[str] = []
    cic = dispatch(
        spec,
        "cic_lookup",
        {"cccd": declared.id_number, "consent_granted": declared.cic_consent},
    )
    tool_calls.append("cic_lookup")
    income_tool = "salary_verify" if any(doc.kind == "sao_ke_luong" for doc in app.documents) else "income_verify"
    if not is_tool_allowed(spec.tools, income_tool):
        income_tool = "income_verify"
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
    proposed_monthly = float(annual_service.get("monthly_payment", 0))
    cic_outstanding = float(cic.get("total_outstanding_vnd") or 0)
    cic_monthly_debt = cic.get("monthly_debt_obligation_vnd")
    existing_monthly_debt = 0.0
    if cic_outstanding > 0 and cic_monthly_debt is None:
        # Outstanding principal cannot be converted to a monthly obligation without
        # schedule/rate data. Do not guess: omit DTI so policy fails closed.
        dti_result = {
            "error": "CIC monthly debt obligation is required when outstanding debt is positive",
            "inputs": {
                "cic_total_outstanding_vnd": cic_outstanding,
                "proposed_monthly_payment": proposed_monthly,
                "monthly_income": verified_income,
            },
        }
        total_monthly_debt = proposed_monthly
    else:
        existing_monthly_debt = max(
            declared.existing_monthly_debt,
            float(cic_monthly_debt) if cic_monthly_debt is not None else 0.0,
        )
        total_monthly_debt = existing_monthly_debt + proposed_monthly
        dti_result = dispatch(
            spec,
            "compute_dti",
            {
                "monthly_debt": total_monthly_debt,
                "monthly_income": verified_income,
            },
        )
        tool_calls.append("compute_dti")

    dti = dti_result.get("dti")
    max_overdue = int(cic.get("max_overdue_days") or cic.get("overdue_days") or 0)
    has_bad_debt = bool(cic.get("has_bad_debt", False))
    cic_group = int(cic.get("cic_group") or 1)

    age = dispatch(
        spec,
        "age_at_maturity_check",
        {"dob": declared.dob, "term_months": declared.term_months},
    )
    tool_calls.append("age_at_maturity_check")
    income_multiple = dispatch(
        spec,
        "amount_within_income_multiple",
        {
            "requested_amount": declared.amount,
            "verified_monthly_income": verified_income,
        },
    )
    tool_calls.append("amount_within_income_multiple")
    purpose_term = dispatch(
        spec,
        "term_matches_purpose",
        {
            "term_months": declared.term_months,
            "declared_purpose": declared.declared_purpose,
        },
    )
    tool_calls.append("term_matches_purpose")
    dti_band = dispatch(
        spec,
        "dti_within_income_band",
        {"dti": dti if isinstance(dti, int | float) else None, "verified_monthly_income": verified_income},
    )
    tool_calls.append("dti_within_income_band")
    disposable = dispatch(
        spec,
        "disposable_income_buffer",
        {
            "verified_monthly_income": verified_income,
            "monthly_debt": total_monthly_debt,
            "personal_expense": declared.personal_expense,
        },
    )
    tool_calls.append("disposable_income_buffer")

    pricing = dispatch(
        spec,
        "price_loan",
        {
            "requested_amount": declared.amount,
            "term_months": declared.term_months,
            "verified_monthly_income": verified_income,
            "dti": dti if isinstance(dti, int | float) else None,
            "cic_group": cic_group,
            "has_bad_debt": has_bad_debt,
            "pricing": config.get("pricing", {}),
        },
    )
    tool_calls.append("price_loan")
    consent_blocked = cic.get("error") == "consent_required" or bool(cic.get("consent_required"))
    recommendation = "review"
    band_cap = dti_cap_for_income(verified_income)
    if consent_blocked:
        recommendation = "manual_review"
    elif isinstance(dti, int | float):
        clean_cic = max_overdue == 0 and not has_bad_debt
        priceable = pricing.get("decision") == "priceable"
        appraisal_ok = (
            bool(age.get("within_range"))
            and bool(income_multiple.get("within_limit"))
            and bool(purpose_term.get("matches"))
            and bool(dti_band.get("within_band"))
            and bool(disposable.get("meets_buffer"))
        )
        recommendation = (
            "support"
            if dti <= band_cap and clean_cic and priceable and appraisal_ok
            else "manual_review"
        )

    return (
        CreditAssessment(
            dti=dti if isinstance(dti, int | float) else None,
            income=verified_income,
            proposed_limit=pricing.get("proposed_limit")
            if isinstance(pricing.get("proposed_limit"), int | float)
            else None,
            proposed_rate=pricing.get("proposed_rate")
            if isinstance(pricing.get("proposed_rate"), int | float)
            else None,
            recommendation=recommendation,
            rationale=(
                "DTI, CIC, pricing and SOP appraisal checks were produced by whitelisted tools; "
                "Credit only interprets the result."
            ),
            evidence=[
                Citation(source="cic_lookup", reference="CIC bureau lookup"),
                Citation(source="income_verify", reference="seeded bank statement"),
                Citation(source="compute_dti", reference="deterministic tool result"),
                Citation(source="age_at_maturity_check", reference="SOP §3.A age at maturity"),
                Citation(source="amount_within_income_multiple", reference="SOP §3.B income multiple"),
                Citation(source="term_matches_purpose", reference="SOP §3.B purpose tenor"),
                Citation(source="dti_within_income_band", reference="SOP §3.C.2 DTI band"),
                Citation(source="disposable_income_buffer", reference="SOP §3.C.3 disposable buffer"),
                Citation(source="price_loan", reference="product pricing config"),
            ],
            tool_results={
                "cic_lookup": cic,
                "income_verify": income,
                "compute_annual_debt_service": annual_service,
                "compute_dti": dti_result,
                "age_at_maturity_check": age,
                "amount_within_income_multiple": income_multiple,
                "term_matches_purpose": purpose_term,
                "dti_within_income_band": dti_band,
                "disposable_income_buffer": disposable,
                "price_loan": pricing,
            },
        ),
        tool_calls,
    )


CreditSpec = AgentSpec(
    name="credit",
    line=1,
    reads=["application"],
    tools=["core_banking_read", "loan_calculator"],
    kb="retail_lending",
    policy="retail_lending.yaml",
    output=CreditAssessment,
    model="deterministic-fallback",
    model_tier="mini",
    max_tool_calls=12,
    prompt=(
        "Assess repayment capacity in Vietnamese prose. "
        "Do not invent DTI, income, limits, rates, or CIC figures — tools already computed them."
    ),
    fallback=credit_fallback,
    llm_prose=True,
    prose_fields=["rationale"],
)
