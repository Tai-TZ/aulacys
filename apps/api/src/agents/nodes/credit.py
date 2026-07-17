from __future__ import annotations

from src.agents.harness.dispatch import dispatch
from src.agents.specs import AgentSpec
from src.agents.state import AgentState, Citation, CreditAssessment


def credit_fallback(state: AgentState, spec: AgentSpec) -> tuple[CreditAssessment, list[str]]:
    app = state["application"]
    declared = app.declared
    statement_income = next(
        (
            doc.extracted.get("monthly_income")
            for doc in app.documents
            if doc.kind in {"sao_ke_luong", "sao_ke_tai_khoan"} and doc.extracted
        ),
        declared.monthly_income,
    )

    tool_calls: list[str] = []
    cic = dispatch(spec, "cic_lookup", {"customer_name": declared.customer_name})
    tool_calls.append("cic_lookup")
    income = dispatch(
        spec,
        "income_verify" if "income_verify" in spec.tools else "salary_verify",
        {
            "declared_monthly_income": declared.monthly_income,
            "statement_monthly_income": statement_income,
        },
    )
    tool_calls.append("income_verify" if "income_verify" in spec.tools else "salary_verify")

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
    recommendation = "review"
    if isinstance(dti, int | float):
        recommendation = "support" if dti <= 0.5 and cic.get("overdue_days", 0) == 0 else "manual_review"

    return (
        CreditAssessment(
            dti=dti if isinstance(dti, int | float) else None,
            income=verified_income,
            recommendation=recommendation,
            evidence=[
                Citation(source="cic_lookup", reference="seeded CIC snapshot"),
                Citation(source="income_verify", reference="seeded bank statement"),
                Citation(source="compute_dti", reference="deterministic tool result"),
            ],
            tool_results={
                "cic_lookup": cic,
                "income_verify": income,
                "compute_annual_debt_service": annual_service,
                "compute_dti": dti_result,
            },
        ),
        tool_calls,
    )


CreditSpec = AgentSpec(
    name="credit",
    line=1,
    reads=["application"],
    tools=["cic_lookup", "income_verify", "salary_verify", "compute_annual_debt_service", "compute_dti"],
    kb="retail_lending",
    policy="retail_lending.yaml",
    output=CreditAssessment,
    model="deterministic-fallback",
    max_tool_calls=6,
    prompt="Assess repayment capacity. Do not make legal conclusions and do not invent numbers.",
    fallback=credit_fallback,
)
