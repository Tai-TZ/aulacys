from __future__ import annotations

from datetime import date

from src.agents.harness.dispatch import dispatch
from src.agents.specs import AgentSpec
from src.agents.state import AgentState, Citation, ComplianceVerdict
from src.agents.tools.loan_calculator import compute_ltv
from src.policy.client import evaluate_policy
from src.policy.loader import rules_for_profile
from src.policy.metrics import MetricCollector


def compliance_fallback(state: AgentState, spec: AgentSpec) -> tuple[ComplianceVerdict, list[str]]:
    app = state["application"]
    declared = app.declared
    operations = state.get("operations")
    credit = state.get("credit")
    product_config = (state.get("metadata", {}) or {}).get("product_config", {}) or {}
    limits = product_config.get("limits") or {}
    tools = product_config.get("tools") or []
    tool_calls: list[str] = []

    # Package profile: valuation / LTV tools ⇒ secured family.
    if limits.get("ltv_cap") is not None or "compute_ltv" in tools or "property_valuation" in tools:
        profile = "secured"
    else:
        profile = "unsecured"

    aml = dispatch(spec, "aml_screen", {"sanctions_match_count": 0, "pep_match_count": 0})
    tool_calls.append("aml_screen")
    related = dispatch(spec, "related_party", {"exposure_ratio_related_group": 0})
    tool_calls.append("related_party")

    metrics: dict[str, float] = {
        "sanctions_match_count": float(aml.get("sanctions_match_count", 0)),
        "pep_match_count": float(aml.get("pep_match_count", 0)),
        "exposure_ratio_related_group": float(related.get("exposure_ratio_related_group", 0)),
    }

    # --- Credit metrics (DTI, CIC, income) ---
    if credit and credit.dti is not None:
        metrics["dti"] = float(credit.dti)
    cic = (credit.tool_results or {}).get("cic_lookup") if credit else None
    if isinstance(cic, dict):
        if cic.get("cic_group") is not None:
            metrics["cic_group"] = float(cic["cic_group"])
        metrics["has_bad_debt"] = 1.0 if cic.get("has_bad_debt") else 0.0
    income = (credit.tool_results or {}).get("income_verify") if credit else None
    if isinstance(income, dict):
        verified = float(income.get("verified_monthly_income") or 0)
        metrics["income_verified"] = 1.0 if verified > 0 else 0.0
    elif credit and credit.income is not None:
        metrics["income_verified"] = 1.0 if float(credit.income) > 0 else 0.0

    # --- Documents ---
    required = (product_config.get("documents") or {}).get("required") or []
    provided = {doc.kind for doc in app.documents}
    # A successful deterministic CIC lookup is the CIC evidence; it need not be
    # duplicated as an uploaded document in the application payload.
    if isinstance(cic, dict) and cic.get("cic_group") is not None:
        provided.add("cic")
    if required:
        metrics["docs_complete"] = 1.0 if all(r in provided for r in required) else 0.0
    elif operations is not None:
        metrics["docs_complete"] = 1.0 if operations.doc_status == "complete" else 0.0
    else:
        metrics["docs_complete"] = 1.0

    # --- Tenor vs product limits ---
    term_ok = True
    if limits.get("term_months_max") is not None:
        term_ok = declared.term_months <= int(limits["term_months_max"])
    elif limits.get("term_years_max") is not None:
        term_ok = declared.term_months <= int(limits["term_years_max"]) * 12
    metrics["term_within_product_max"] = 1.0 if term_ok else 0.0

    # --- Collateral / LTV (secured) ---
    if operations and operations.valuation:
        ltv = compute_ltv.invoke({"loan_amount": declared.amount, "collateral_value": operations.valuation})
        tool_calls.append("compute_ltv")
        if "ltv" in ltv:
            metrics["ltv"] = float(ltv["ltv"])
            ltv_cap = limits.get("ltv_cap")
            if ltv_cap is not None:
                metrics["ltv_within_product_cap"] = 1.0 if metrics["ltv"] <= float(ltv_cap) else 0.0
        flags = list(operations.legal_flags or [])
        metrics["land_registry_ok"] = 0.0 if flags else 1.0
    elif profile == "secured" and operations is not None:
        # Ops ran but no valuation — still surface land flags if any.
        flags = list(operations.legal_flags or [])
        metrics["land_registry_ok"] = 0.0 if flags else 1.0

    ceiling = limits.get("amount_ceiling")
    if ceiling is not None:
        metrics["amount_within_product_ceiling"] = 1.0 if float(declared.amount) <= float(ceiling) else 0.0

    purpose_doc = next((doc for doc in app.documents if doc.kind == "purpose_evidence" and doc.extracted), None)
    evidence_purpose = str(purpose_doc.extracted.get("actual_purpose", "")) if purpose_doc else ""
    declared_purpose = declared.declared_purpose.lower()
    metrics["prohibited_purpose_refinance_other_bank"] = 0.0
    if "tất toán" in evidence_purpose.lower() or "tat toan" in evidence_purpose.lower():
        metrics["prohibited_purpose_refinance_other_bank"] = 1.0
    elif "refinance" in declared_purpose:
        metrics["prohibited_purpose_refinance_other_bank"] = 1.0

    product_code = getattr(app, "product", None) or product_config.get("id")
    metric_sources = {
        "sanctions_match_count": "aml_screen",
        "pep_match_count": "aml_screen",
        "exposure_ratio_related_group": "related_party",
        "dti": "compute_dti",
        "cic_group": "cic_lookup",
        "has_bad_debt": "cic_lookup",
        "income_verified": "income_verify",
        "docs_complete": "document_checklist",
        "term_within_product_max": "product_config",
        "ltv": "compute_ltv",
        "ltv_within_product_cap": "compute_ltv+product_config",
        "land_registry_ok": "land_registry",
        "amount_within_product_ceiling": "application+product_config",
        "prohibited_purpose_refinance_other_bank": "purpose_evidence",
    }
    collector = MetricCollector()
    for name, value in metrics.items():
        collector.record(name, value, source=metric_sources[name])
    required_metrics = {
        rule.metric for rule in rules_for_profile(profile, product_code=str(product_code) if product_code else None)
    }
    metric_report = collector.report(profile, required_metrics)
    policy_metrics = metric_report.policy_values()
    violations = evaluate_policy(
        policy_metrics,
        as_of=date.today(),
        profile=profile,
        product_code=str(product_code) if product_code else None,
    )
    return (
        ComplianceVerdict(
            violations=violations,
            veto=any(violation.is_blocking for violation in violations),
            rule_ids=[violation.rule_id for violation in violations],
            citations=[
                Citation(source="policy.evaluate", reference=violation.legal_basis, excerpt=violation.rule_id)
                for violation in violations
            ],
            tool_results={
                "aml_screen": aml,
                "related_party": related,
                "metrics": policy_metrics,
                "metric_report": metric_report.model_dump(),
                "profile": profile,
                "product_code": product_code,
            },
        ),
        tool_calls,
    )


ComplianceSpec = AgentSpec(
    name="compliance",
    line=2,
    reads=["application", "credit", "operations"],
    tools=["aml_screen", "related_party", "compute_ltv"],
    kb="regulation",
    policy="retail_lending.yaml",
    output=ComplianceVerdict,
    model="deterministic-fallback",
    max_tool_calls=5,
    prompt="Evaluate hard legal and policy limits from YAML only. Veto with rule IDs.",
    fallback=compliance_fallback,
)
