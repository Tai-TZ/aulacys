from __future__ import annotations

from aulacys.agents.harness.dispatch import dispatch
from aulacys.agents.harness.permissions import is_tool_allowed
from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, Citation, CreditAssessment


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
    dti_result = dispatch(
        spec,
        "compute_dti",
        {
            "monthly_debt": declared.existing_monthly_debt + proposed_monthly,
            "monthly_income": verified_income,
        },
    )
    tool_calls.append("compute_dti")

    dti = dti_result.get("dti")
    max_overdue = int(cic.get("max_overdue_days") or cic.get("overdue_days") or 0)
    has_bad_debt = bool(cic.get("has_bad_debt", False))
    cic_group = int(cic.get("cic_group") or 1)
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
    if consent_blocked:
        recommendation = "manual_review"
    elif isinstance(dti, int | float):
        clean_cic = max_overdue == 0 and not has_bad_debt
        priceable = pricing.get("decision") == "priceable"
        recommendation = "support" if dti <= 0.5 and clean_cic and priceable else "manual_review"

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
            rationale=("DTI, CIC and pricing were produced by whitelisted tools; Credit only interprets the result."),
            evidence=[
                Citation(source="cic_lookup", reference="CIC bureau lookup"),
                Citation(source="income_verify", reference="seeded bank statement"),
                Citation(source="compute_dti", reference="deterministic tool result"),
                Citation(source="price_loan", reference="product pricing config"),
            ],
            tool_results={
                "cic_lookup": cic,
                "income_verify": income,
                "compute_annual_debt_service": annual_service,
                "compute_dti": dti_result,
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
    max_tool_calls=7,
    prompt="Assess repayment capacity. Do not make legal conclusions and do not invent numbers.",
    fallback=credit_fallback,
)
