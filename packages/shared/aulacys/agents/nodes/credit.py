from __future__ import annotations

from aulacys.agents.harness.dispatch import dispatch
from aulacys.agents.harness.permissions import is_tool_allowed
from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, Citation, CreditAssessment, LoanProposal


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
    else:
        existing_monthly_debt = max(
            declared.existing_monthly_debt,
            float(cic_monthly_debt) if cic_monthly_debt is not None else 0.0,
        )
        dti_result = dispatch(
            spec,
            "compute_dti",
            {
                "monthly_debt": existing_monthly_debt + proposed_monthly,
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

    proposal = _build_loan_proposal(
        requested_amount=float(declared.amount),
        declared_rate=float(declared.annual_rate),
        term_months=int(declared.term_months),
        monthly_payment=proposed_monthly,
        dti=dti if isinstance(dti, int | float) else None,
        pricing=pricing,
        recommendation=recommendation,
        consent_blocked=consent_blocked,
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
            proposal=proposal,
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
