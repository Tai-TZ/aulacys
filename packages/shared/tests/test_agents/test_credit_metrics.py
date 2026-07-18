from __future__ import annotations

from aulacys.agents.nodes import credit as credit_node
from aulacys.agents.nodes.credit import CreditSpec, credit_fallback
from aulacys.agents.state import DeclaredForm, LoanApplication


def _state() -> dict:
    return {
        "application": LoanApplication(
            product="loan-unsecured-term",
            declared=DeclaredForm(
                customer_name="Metric Test",
                amount=100_000_000,
                term_months=24,
                annual_rate=0.12,
                monthly_income=20_000_000,
                existing_monthly_debt=1_000_000,
                declared_purpose="Tiêu dùng",
                id_number="001",
                cic_consent=True,
            ),
            documents=[],
        )
    }


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
            return {"decision": "manual_review"}
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(credit_node, "dispatch", fake_dispatch)

    result, tool_calls = credit_fallback(_state(), CreditSpec)

    assert result.dti is None
    assert "monthly debt obligation is required" in result.tool_results["compute_dti"]["error"]
    assert "compute_dti" not in tool_calls


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
