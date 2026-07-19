from __future__ import annotations

from aulacys.agents.nodes import credit as credit_node
from aulacys.agents.nodes.credit import CreditSpec, credit_fallback
from aulacys.agents.state import DeclaredForm, Document, LoanApplication


def _state(
    *,
    amount: float = 100_000_000,
    term_months: int = 24,
    annual_rate: float = 0.12,
    monthly_income: float = 20_000_000,
    existing_monthly_debt: float = 1_000_000,
    id_number: str = "001",
    national_id: str | None = None,
    cic_consent: bool = True,
    consent_data_processing: bool | None = None,
    documents: list[Document] | None = None,
    product_config: dict | None = None,
) -> dict:
    return {
        "application": LoanApplication(
            product="loan-unsecured-term",
            declared=DeclaredForm(
                customer_name="Metric Test",
                amount=amount,
                term_months=term_months,
                annual_rate=annual_rate,
                monthly_income=monthly_income,
                existing_monthly_debt=existing_monthly_debt,
                declared_purpose="Tiêu dùng",
                id_number=id_number,
                national_id=national_id,
                cic_consent=cic_consent,
                consent_data_processing=consent_data_processing,
            ),
            documents=documents or [],
        ),
        "metadata": {
            "product_config": product_config
            or {
                "limits": {"amount_ceiling": 500_000_000, "term_months_max": 60},
                "pricing": {
                    "base_rate": 0.13,
                    "min_rate": 0.11,
                    "max_rate": 0.18,
                    "max_dti": 0.5,
                    "income_multiple": 24,
                },
            }
        },
    }


def _clean_tools(
    monkeypatch,
    *,
    dti: float = 0.3,
    decision: str = "priceable",
    limit: float = 100_000_000,
    proposed_rate: float = 0.13,
    cic_group: int = 1,
    consent_required: bool = False,
):
    def fake_dispatch(_spec, name, args):
        if name == "cic_lookup":
            if consent_required or args.get("consent_granted") is False:
                return {
                    "error": "consent_required",
                    "consent_required": True,
                    "cic_group": 0,
                    "has_bad_debt": False,
                    "max_overdue_days": 0,
                    "total_outstanding_vnd": 0,
                    "cccd": args.get("cccd"),
                    "inputs": args,
                }
            return {
                "cic_group": cic_group,
                "has_bad_debt": False,
                "max_overdue_days": 0,
                "total_outstanding_vnd": 0,
                "monthly_debt_obligation_vnd": 0,
                "cccd": args.get("cccd"),
                "inputs": args,
            }
        if name in {"income_verify", "salary_verify"}:
            return {"verified_monthly_income": 20_000_000}
        if name == "compute_annual_debt_service":
            return {"monthly_payment": 5_000_000}
        if name == "compute_dti":
            return {"dti": dti, "inputs": args}
        if name == "price_loan":
            return {
                "decision": decision,
                "proposed_limit": limit,
                "proposed_rate": proposed_rate,
                "inputs": args,
            }
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(credit_node, "dispatch", fake_dispatch)


def test_dti_fails_closed_when_cic_debt_has_no_monthly_obligation(monkeypatch) -> None:
    def fake_dispatch(_spec, name, _args):
        if name == "cic_lookup":
            return {
                "cic_group": 1,
                "has_bad_debt": False,
                "total_outstanding_vnd": 200_000_000,
            }
        if name in {"income_verify", "salary_verify"}:
            return {"verified_monthly_income": 20_000_000}
        if name == "compute_annual_debt_service":
            return {"monthly_payment": 5_000_000}
        if name == "age_at_maturity_check":
            return {"within_range": True}
        if name == "amount_within_income_multiple":
            return {"within_limit": True}
        if name == "term_matches_purpose":
            return {"matches": True}
        if name == "dti_within_income_band":
            return {"within_band": False}
        if name == "disposable_income_buffer":
            return {"meets_buffer": True}
        if name == "price_loan":
            return {"decision": "manual_review", "proposed_rate": 0.13, "proposed_limit": 0}
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(credit_node, "dispatch", fake_dispatch)

    result, tool_calls = credit_fallback(_state(), CreditSpec)

    assert result.dti is None
    assert "monthly debt obligation is required" in result.tool_results["compute_dti"]["error"]
    assert "compute_dti" not in tool_calls
    assert not any(c.source == "compute_dti" for c in result.evidence)
    assert result.recommendation == "manual_review"


def test_dti_uses_cic_monthly_obligation_instead_of_declared_debt(monkeypatch) -> None:
    captured: dict = {}

    def fake_dispatch(_spec, name, args):
        if name == "cic_lookup":
            return {
                "cic_group": 1,
                "has_bad_debt": False,
                "total_outstanding_vnd": 200_000_000,
                "monthly_debt_obligation_vnd": 3_000_000,
            }
        if name in {"income_verify", "salary_verify"}:
            return {"verified_monthly_income": 20_000_000}
        if name == "compute_annual_debt_service":
            return {"monthly_payment": 5_000_000}
        if name == "compute_dti":
            captured.update(args)
            return {"dti": 0.4, "inputs": args}
        if name == "age_at_maturity_check":
            return {"within_range": True}
        if name == "amount_within_income_multiple":
            return {"within_limit": True}
        if name == "term_matches_purpose":
            return {"matches": True}
        if name == "dti_within_income_band":
            return {"within_band": True}
        if name == "disposable_income_buffer":
            return {"meets_buffer": True}
        if name == "price_loan":
            return {"decision": "priceable", "proposed_limit": 100_000_000, "proposed_rate": 0.13}
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(credit_node, "dispatch", fake_dispatch)

    result, _ = credit_fallback(_state(), CreditSpec)

    assert result.dti == 0.4
    assert captured["monthly_debt"] == 8_000_000


def test_credit_supports_reasonable_proposal(monkeypatch) -> None:
    _clean_tools(monkeypatch)

    result, tool_calls = credit_fallback(_state(), CreditSpec)

    assert result.recommendation == "support"
    assert result.dti == 0.3
    assert result.proposed_limit == 100_000_000
    assert "proposal_reasonableness" in result.tool_results
    assert result.tool_results["proposal_reasonableness"]["findings"] == []
    assert tool_calls == [
        "cic_lookup",
        "income_verify",
        "compute_annual_debt_service",
        "compute_dti",
        "price_loan",
    ]
    assert "không phê duyệt khoản vay" in result.rationale
    assert "không veto pháp lý" in result.rationale
    assert "không tự bịa số liệu" in result.rationale


def test_credit_uses_national_id_for_cic_lookup(monkeypatch) -> None:
    captured: dict = {}

    def fake_dispatch(_spec, name, args):
        if name == "cic_lookup":
            captured.update(args)
            return {
                "cic_group": 1,
                "has_bad_debt": False,
                "max_overdue_days": 0,
                "total_outstanding_vnd": 0,
                "monthly_debt_obligation_vnd": 0,
            }
        if name in {"income_verify", "salary_verify"}:
            return {"verified_monthly_income": 20_000_000}
        if name == "compute_annual_debt_service":
            return {"monthly_payment": 5_000_000}
        if name == "compute_dti":
            return {"dti": 0.3, "inputs": args}
        if name == "price_loan":
            return {"decision": "priceable", "proposed_limit": 100_000_000, "proposed_rate": 0.13}
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(credit_node, "dispatch", fake_dispatch)

    credit_fallback(
        _state(id_number="001099000003", national_id="074300004128"),
        CreditSpec,
    )

    assert captured["cccd"] == "074300004128"


def test_credit_uses_cccd_document_when_national_id_absent(monkeypatch) -> None:
    captured: dict = {}

    def fake_dispatch(_spec, name, args):
        if name == "cic_lookup":
            captured.update(args)
            return {
                "cic_group": 1,
                "has_bad_debt": False,
                "max_overdue_days": 0,
                "total_outstanding_vnd": 0,
                "monthly_debt_obligation_vnd": 0,
            }
        if name in {"income_verify", "salary_verify"}:
            return {"verified_monthly_income": 20_000_000}
        if name == "compute_annual_debt_service":
            return {"monthly_payment": 5_000_000}
        if name == "compute_dti":
            return {"dti": 0.3, "inputs": args}
        if name == "price_loan":
            return {"decision": "priceable", "proposed_limit": 100_000_000, "proposed_rate": 0.13}
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(credit_node, "dispatch", fake_dispatch)

    credit_fallback(
        _state(
            id_number="001099000003",
            documents=[Document(kind="cccd", tier=1, extracted={"id_number": "054301008970"})],
        ),
        CreditSpec,
    )

    assert captured["cccd"] == "054301008970"


def test_credit_manual_review_when_dti_exceeds_product_max(monkeypatch) -> None:
    _clean_tools(monkeypatch, dti=0.62, decision="limit_reduced", limit=70_000_000)

    result, _ = credit_fallback(_state(), CreditSpec)

    assert result.recommendation == "manual_review"
    findings = result.tool_results["proposal_reasonableness"]["findings"]
    assert any("max_dti" in item for item in findings)


def test_credit_manual_review_when_limit_reduced_only(monkeypatch) -> None:
    _clean_tools(monkeypatch, dti=0.3, decision="limit_reduced", limit=70_000_000)

    result, _ = credit_fallback(_state(), CreditSpec)

    assert result.recommendation == "manual_review"
    assert any("limit_reduced" in item for item in result.tool_results["proposal_reasonableness"]["findings"])


def test_credit_review_when_term_exceeds_product_max(monkeypatch) -> None:
    _clean_tools(monkeypatch)

    result, _ = credit_fallback(_state(term_months=84), CreditSpec)

    assert result.recommendation == "review"
    findings = result.tool_results["proposal_reasonableness"]["findings"]
    assert any("term_months" in item for item in findings)


def test_credit_manual_review_when_max_dti_missing(monkeypatch) -> None:
    _clean_tools(monkeypatch)
    config = {
        "limits": {"amount_ceiling": 500_000_000, "term_months_max": 60},
        "pricing": {"base_rate": 0.13, "min_rate": 0.11, "max_rate": 0.18, "income_multiple": 24},
    }

    result, _ = credit_fallback(_state(product_config=config), CreditSpec)

    assert result.recommendation == "manual_review"
    assert any("max_dti" in item for item in result.tool_results["proposal_reasonableness"]["findings"])


def test_credit_cic_consent_not_overridden_by_data_consent(monkeypatch) -> None:
    captured: dict = {}

    def dispatch_capture(_spec, name, args):
        if name == "cic_lookup":
            captured.update(args)
            return {
                "error": "consent_required",
                "consent_required": True,
                "cic_group": 0,
                "has_bad_debt": False,
                "max_overdue_days": 0,
                "total_outstanding_vnd": 0,
            }
        if name in {"income_verify", "salary_verify"}:
            return {"verified_monthly_income": 20_000_000}
        if name == "compute_annual_debt_service":
            return {"monthly_payment": 5_000_000}
        if name == "compute_dti":
            return {"dti": 0.3, "inputs": args}
        if name == "price_loan":
            assert args["cic_group"] == 5
            return {
                "decision": "decline_or_manual_review",
                "proposed_limit": 0,
                "proposed_rate": 0.13,
                "inputs": args,
            }
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(credit_node, "dispatch", dispatch_capture)

    result, _ = credit_fallback(
        _state(cic_consent=False, consent_data_processing=True),
        CreditSpec,
    )

    assert captured["consent_granted"] is False
    assert result.recommendation == "manual_review"


def test_credit_uses_salary_verify_for_salary_statement(monkeypatch) -> None:
    def fake_dispatch(_spec, name, args):
        if name == "cic_lookup":
            return {
                "cic_group": 1,
                "has_bad_debt": False,
                "max_overdue_days": 0,
                "total_outstanding_vnd": 0,
                "monthly_debt_obligation_vnd": 0,
            }
        if name in {"income_verify", "salary_verify"}:
            return {"verified_monthly_income": 22_000_000}
        if name == "compute_annual_debt_service":
            return {"monthly_payment": 5_000_000}
        if name == "compute_dti":
            return {"dti": 0.3, "inputs": args}
        if name == "price_loan":
            return {"decision": "priceable", "proposed_limit": 100_000_000, "proposed_rate": 0.13}
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(credit_node, "dispatch", fake_dispatch)

    result, tool_calls = credit_fallback(
        _state(documents=[Document(kind="sao_ke_luong", tier=1, extracted={"monthly_income": 22_000_000})]),
        CreditSpec,
    )

    assert "salary_verify" in tool_calls
    assert "salary_verify" in result.tool_results
    assert result.tool_results["income_verify"]["verified_monthly_income"] == 22_000_000
    assert any(citation.source == "salary_verify" for citation in result.evidence)


def test_credit_spec_stays_inside_role() -> None:
    assert CreditSpec.tools == ["core_banking_read", "loan_calculator"]
    assert "metadata" in CreditSpec.reads
    assert CreditSpec.llm_prose is True
    assert CreditSpec.prose_fields == ["rationale"]
    assert CreditSpec.max_tool_calls == 7


def test_credit_rationale_stays_qualitative(monkeypatch) -> None:
    _clean_tools(monkeypatch)
    result, _ = credit_fallback(_state(), CreditSpec)
    assert "kết quả tool" in result.rationale
    assert "DTI=" not in result.rationale
    assert "monthly_payment=" not in result.rationale
    assert "cic_clean" not in result.rationale  # human label, not raw flag
