from __future__ import annotations

from datetime import date
from typing import TypeVar

from aulacys.agents.harness.dispatch import dispatch
from aulacys.agents.specs import AgentSpec
from aulacys.agents.tools.regional_income import extract_province_from_address
from pydantic import BaseModel, ValidationError

from aulacys.agents.state import (
    AMLScreeningFacts,
    AgentState,
    Citation,
    ComplianceVerdict,
    PolicyDecisionEvidence,
    RelatedPartyFacts,
)
from aulacys.policy.client import evaluate_policy
from aulacys.policy.loader import rules_for_profile
from aulacys.policy.metrics import MetricCollector

FactsT = TypeVar("FactsT", bound=BaseModel)


def _document_facts(state: AgentState, kind: str, model: type[FactsT]) -> FactsT:
    """Validate external facts at the agent boundary without product-specific code."""
    document = next((doc for doc in state["application"].documents if doc.kind == kind and doc.extracted), None)
    try:
        return model.model_validate(document.extracted if document else {})
    except ValidationError:
        # Invalid external facts must not become trusted metrics. The empty model is
        # the safe fallback; required policy metrics still fail closed downstream.
        return model()


def _document_is_usable(document: object) -> bool:
    return bool(document and (getattr(document, "extracted", None) or getattr(document, "confirmed_by", None)))


def compliance_fallback(state: AgentState, spec: AgentSpec) -> tuple[ComplianceVerdict, list[str]]:
    app = state["application"]
    declared = app.declared
    operations = state.get("operations")
    credit = state.get("credit")
    product_config = (state.get("metadata", {}) or {}).get("product_config", {}) or {}
    limits = product_config.get("limits") or {}
    tools = product_config.get("tools") or []
    tool_calls: list[str] = []
    aml_facts = _document_facts(state, "aml_screening", AMLScreeningFacts)
    aml_document = next((doc for doc in app.documents if doc.kind == "aml_screening"), None)
    aml_document_valid = True
    if aml_document and aml_document.extracted:
        try:
            AMLScreeningFacts.model_validate(aml_document.extracted)
        except ValidationError:
            aml_document_valid = False
    related_party_facts = _document_facts(state, "related_party", RelatedPartyFacts)
    cccd_doc = next((doc for doc in app.documents if doc.kind == "cccd" and doc.extracted), None)
    cccd_verified = bool(cccd_doc and cccd_doc.extracted.get("verified"))
    data_consent = (
        declared.consent_data_processing if declared.consent_data_processing is not None else declared.cic_consent
    )

    kyc = dispatch(
        spec,
        "kyc_check",
        {
            "id_number": declared.id_number,
            "national_id": declared.national_id,
            "consent_granted": bool(data_consent),
            "cccd_verified": cccd_verified,
        },
    )
    tool_calls.append("kyc_check")
    ubo = dispatch(
        spec,
        "ubo_check",
        {
            "is_retail_customer": True,
            "spouse_national_id": declared.spouse_national_id,
            "related_party_flag": related_party_facts.related_party_flag,
        },
    )
    tool_calls.append("ubo_check")

    cccd = (declared.national_id or declared.id_number or "").strip()
    # Prefer live selfie from dossier if present; else enrolled KYC avatar from eKYC.
    selfie_doc = next(
        (doc for doc in app.documents if doc.kind in {"selfie", "avatar", "ekyc_selfie"} and doc.extracted),
        None,
    )
    live_avatar = None
    if selfie_doc and isinstance(selfie_doc.extracted, dict):
        live_avatar = selfie_doc.extracted.get("avatar") or selfie_doc.extracted.get("url")
    verification_avatar = live_avatar or kyc.get("avatar")
    ekyc = dispatch(
        spec,
        "ekyc_face_match",
        {"id_number": cccd, "avatar": verification_avatar},
    )
    tool_calls.append("ekyc_face_match")
    geo = dispatch(
        spec,
        "geo_radius_check",
        {"id_number": cccd, "max_km": 50.0},
    )
    tool_calls.append("geo_radius_check")

    # Package profile: valuation / LTV tools ⇒ secured family.
    policy_config = product_config.get("policy") or {}
    configured_profile = policy_config.get("profile") if isinstance(policy_config, dict) else None
    configured_rule_sets = policy_config.get("rule_sets") if isinstance(policy_config, dict) else None
    if configured_profile in {"secured", "unsecured"}:
        profile = configured_profile
    elif limits.get("ltv_cap") is not None or "compute_ltv" in tools or "property_valuation" in tools:
        profile = "secured"
    else:
        profile = "unsecured"

    aml = dispatch(
        spec,
        "aml_screen",
        {
            "sanctions_match_count": aml_facts.sanctions_match_count,
            "pep_match_count": aml_facts.pep_match_count,
            "customer_name": declared.customer_name,
        },
    )
    tool_calls.append("aml_screen")
    related = dispatch(
        spec,
        "related_party",
        {"exposure_ratio_related_group": related_party_facts.exposure_ratio_related_group},
    )
    tool_calls.append("related_party")

    aml_checked = aml.get("status") == "checked" and aml_document_valid
    metrics: dict[str, float] = {
        "aml_screening_complete": 1.0 if aml_checked else 0.0,
        # Zero is only a placeholder when incomplete; AML completeness is the
        # explicit fail-safe gate that prevents this from being treated as clean.
        "sanctions_match_count": float(aml.get("sanctions_match_count", 0)),
        "pep_match_count": float(aml.get("pep_match_count", 0)),
        "exposure_ratio_related_group": float(related.get("exposure_ratio_related_group", 0)),
        "kyc_verified": 1.0 if kyc.get("status") == "passed" else 0.0,
        "ubo_clear": 1.0 if ubo.get("status") in {"passed", "not_applicable"} else 0.0,
        "ekyc_face_match_ok": 1.0 if ekyc.get("passed") else 0.0,
        "geo_within_radius": 1.0 if geo.get("within_radius") else 0.0,
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
    verified_income = 0.0
    if isinstance(income, dict):
        verified_income = float(income.get("verified_monthly_income") or 0)
        metrics["income_verified"] = 1.0 if verified_income > 0 else 0.0
    elif credit and credit.income is not None:
        verified_income = float(credit.income)
        metrics["income_verified"] = 1.0 if verified_income > 0 else 0.0

    province = geo.get("province") if isinstance(geo, dict) else None
    if not province:
        province = extract_province_from_address(declared.permanent_address or declared.current_address)
    regional = dispatch(
        spec,
        "regional_income_check",
        {"province": province, "verified_monthly_income": verified_income},
    )
    tool_calls.append("regional_income_check")
    metrics["income_meets_regional_min"] = 1.0 if regional.get("meets_minimum") else 0.0

    # --- SOP appraisal flags from Credit tools ---
    credit_tools = (credit.tool_results or {}) if credit else {}
    age = credit_tools.get("age_at_maturity_check") if isinstance(credit_tools, dict) else None
    income_multiple = credit_tools.get("amount_within_income_multiple") if isinstance(credit_tools, dict) else None
    purpose_term = credit_tools.get("term_matches_purpose") if isinstance(credit_tools, dict) else None
    dti_band = credit_tools.get("dti_within_income_band") if isinstance(credit_tools, dict) else None
    disposable = credit_tools.get("disposable_income_buffer") if isinstance(credit_tools, dict) else None
    if isinstance(age, dict):
        metrics["age_at_maturity_ok"] = 1.0 if age.get("within_range") else 0.0
    if isinstance(income_multiple, dict):
        metrics["amount_within_income_multiple"] = 1.0 if income_multiple.get("within_limit") else 0.0
    if isinstance(purpose_term, dict):
        metrics["term_matches_purpose"] = 1.0 if purpose_term.get("matches") else 0.0
    if isinstance(dti_band, dict):
        metrics["dti_within_income_band"] = 1.0 if dti_band.get("within_band") else 0.0
    if isinstance(disposable, dict):
        metrics["disposable_buffer_ok"] = 1.0 if disposable.get("meets_buffer") else 0.0

    # --- Documents ---
    required = (product_config.get("documents") or {}).get("required") or []
    provided = {doc.kind for doc in app.documents if _document_is_usable(doc)}
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
        ltv = dispatch(spec, "compute_ltv", {"loan_amount": declared.amount, "collateral_value": operations.valuation})
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
        "kyc_verified": "kyc_check",
        "ubo_clear": "ubo_check",
        "ekyc_face_match_ok": "ekyc_face_match",
        "geo_within_radius": "geo_radius_check",
        "sanctions_match_count": "aml_screen",
        "pep_match_count": "aml_screen",
        "aml_screening_complete": "aml_screen",
        "exposure_ratio_related_group": "related_party",
        "dti": "compute_dti",
        "cic_group": "cic_lookup",
        "has_bad_debt": "cic_lookup",
        "income_verified": "income_verify",
        "income_meets_regional_min": "regional_income_check",
        "age_at_maturity_ok": "age_at_maturity_check",
        "amount_within_income_multiple": "amount_within_income_multiple",
        "term_matches_purpose": "term_matches_purpose",
        "dti_within_income_band": "dti_within_income_band",
        "disposable_buffer_ok": "disposable_income_buffer",
        "docs_complete": "document_checklist",
        "term_within_product_max": "product_config",
        "ltv": "compute_ltv",
        "ltv_within_product_cap": "compute_ltv+product_config",
        "land_registry_ok": "land_registry",
        "amount_within_product_ceiling": "application+product_config",
        "prohibited_purpose_refinance_other_bank": "purpose_evidence",
    }
    collector = MetricCollector()
    evidence_by_source = {
        "aml_screen": (str(aml.get("evidence_id", "")), str(aml.get("dataset_version", ""))),
        "ekyc_face_match": (str(ekyc.get("evidence_id", "")), str(ekyc.get("dataset_version", ""))),
        "geo_radius_check": (str(geo.get("evidence_id", "")), str(geo.get("dataset_version", ""))),
        "regional_income_check": (
            str(regional.get("evidence_id", "")),
            str(regional.get("dataset_version", "")),
        ),
        "age_at_maturity_check": ("credit:age_at_maturity_check", "2026.1"),
        "amount_within_income_multiple": ("credit:amount_within_income_multiple", "2026.1"),
        "term_matches_purpose": ("credit:term_matches_purpose", "2026.1"),
        "dti_within_income_band": ("credit:dti_within_income_band", "2026.1"),
        "disposable_income_buffer": ("credit:disposable_income_buffer", "2026.1"),
        "product_config": (f"product:{product_code}", str(product_config.get("version", ""))),
        "application+product_config": (f"application:{product_code}", str(product_config.get("version", ""))),
    }
    for name, value in metrics.items():
        source = metric_sources[name]
        evidence_id, dataset_version = evidence_by_source.get(source, ("", ""))
        collector.record(name, value, source=source, evidence_id=evidence_id, dataset_version=dataset_version)
    active_rules = rules_for_profile(
        profile,
        product_code=str(product_code) if product_code else None,
        rule_sets=configured_rule_sets if isinstance(configured_rule_sets, list) else None,
    )
    required_metrics = {rule.metric for rule in active_rules}
    metric_report = collector.report(profile, required_metrics)
    policy_metrics = metric_report.policy_values()
    violations = evaluate_policy(
        policy_metrics,
        as_of=date.today(),
        profile=profile,
        product_code=str(product_code) if product_code else None,
        rule_sets=configured_rule_sets if isinstance(configured_rule_sets, list) else None,
    )
    violation_by_rule = {violation.rule_id: violation for violation in violations}
    rule_evidence: list[PolicyDecisionEvidence] = []
    for rule in active_rules:
        fact = metric_report.facts.get(rule.metric)
        violation = violation_by_rule.get(rule.id)
        status = "passed"
        if violation:
            status = "missing" if violation.missing_metric else violation.severity
        rule_evidence.append(
            PolicyDecisionEvidence(
                rule_id=rule.id,
                status=status,
                metric=rule.metric,
                actual=fact.value if fact else None,
                threshold=rule.threshold,
                source=fact.source if fact else "missing",
                evidence_id=fact.evidence_id if fact else "",
                dataset_version=fact.dataset_version if fact else "",
                standard_reference=rule.legal_basis,
                policy_version=rule.version,
            )
        )
    return (
        ComplianceVerdict(
            violations=violations,
            veto=any(violation.is_blocking for violation in violations),
            rule_ids=[violation.rule_id for violation in violations],
            kyc_status=str(kyc.get("status", "unknown")),
            ubo_status=str(ubo.get("status", "unknown")),
            citations=[
                Citation(source="policy.evaluate", reference=violation.legal_basis, excerpt=violation.rule_id)
                for violation in violations
            ],
            rule_evidence=rule_evidence,
            tool_results={
                "kyc_check": kyc,
                "ubo_check": ubo,
                "ekyc_face_match": ekyc,
                "geo_radius_check": geo,
                "regional_income_check": regional,
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
    tools=["core_banking_read", "aml_screening"],
    kb="regulation",
    policy="retail_lending.yaml",
    output=ComplianceVerdict,
    model="deterministic-fallback",
    model_tier="mini",
    max_tool_calls=10,
    prompt="Evaluate hard legal and policy limits from YAML only. Veto with rule IDs.",
    fallback=compliance_fallback,
)
