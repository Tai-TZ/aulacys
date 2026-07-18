"""application-svc → LoanApplication mapper + consent gate."""

from __future__ import annotations

import pytest

from src.agents.application_client import ConsentDeniedError, map_to_loan_application


def _section_a(**overrides):
    base = {
        "id": "11111111-1111-1111-1111-111111111111",
        "product": "retail_unsecured_salary",
        "total_amount": "50000000",
        "term_months": 36,
        "applicant": {
            "full_name": "Nguyen Van A",
            "id_number": "001099000001",
        },
        "financial": {"total_income": "20000000", "personal_expense": "5000000"},
        "consent": {"data_processing_consent": True, "marketing_consent": False},
        "purposes": [{"category": "consumer", "amount": "50000000", "purpose_detail": "mua_sam"}],
    }
    base.update(overrides)
    return base


def test_mapper_maps_section_a_fields() -> None:
    app = map_to_loan_application(_section_a())
    assert app.product == "retail_unsecured_salary"
    assert app.declared.customer_name == "Nguyen Van A"
    assert app.declared.amount == 50_000_000
    assert app.declared.term_months == 36
    assert app.declared.monthly_income == 20_000_000
    assert app.declared.existing_monthly_debt == 5_000_000
    assert app.declared.declared_purpose == "mua_sam"
    assert app.declared.id_number == "001099000001"
    assert app.declared.cic_consent is True
    assert any(d.kind == "cccd" for d in app.documents)
    assert any(d.kind == "sao_ke_luong" for d in app.documents)


def test_mapper_consent_gate() -> None:
    with pytest.raises(ConsentDeniedError, match="data_processing_consent"):
        map_to_loan_application(_section_a(consent={"data_processing_consent": False, "marketing_consent": False}))


def test_product_override() -> None:
    app = map_to_loan_application(_section_a(), product_override="loan-unsecured-term")
    assert app.product == "loan-unsecured-term"
