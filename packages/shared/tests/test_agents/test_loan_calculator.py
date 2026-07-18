"""The numbers these tools return end up in a credit proposal, so they get real tests.

Hand-checked expected values only — no asserting a function against itself.
"""

import pytest

from aulacys.agents.tools.loan_calculator import (
    compute_annual_debt_service,
    compute_dscr,
    compute_dti,
    compute_exposure_ratio,
    compute_ltv,
)

BN = 1_000_000_000  # tỷ VND, for readability


class TestComputeDti:
    def test_known_value(self):
        result = compute_dti.invoke({"monthly_debt": 20_000_000, "monthly_income": 50_000_000})
        assert result["dti"] == 0.4
        assert result["formula"] == "dti = monthly_debt / monthly_income"

    def test_zero_income_errors_not_raises(self):
        result = compute_dti.invoke({"monthly_debt": 20_000_000, "monthly_income": 0})
        assert "error" in result


class TestComputeDscr:
    def test_known_value(self):
        # 30bn EBITDA against 20bn total service = 1.5
        result = compute_dscr.invoke(
            {
                "ebitda": 30 * BN,
                "existing_annual_debt_service": 8 * BN,
                "proposed_annual_debt_service": 12 * BN,
            }
        )
        assert result["dscr"] == 1.5
        assert result["inputs"]["total_annual_debt_service"] == 20 * BN

    def test_carries_its_own_evidence(self):
        # Critic traces numbers back through these fields; without them a figure is
        # unverifiable and gets rejected.
        result = compute_dscr.invoke(
            {"ebitda": 10 * BN, "existing_annual_debt_service": 0, "proposed_annual_debt_service": 5 * BN}
        )
        assert "formula" in result
        assert "computed_at" in result
        assert result["inputs"]["ebitda"] == 10 * BN

    def test_zero_debt_service_errors_not_raises(self):
        result = compute_dscr.invoke(
            {"ebitda": 10 * BN, "existing_annual_debt_service": 0, "proposed_annual_debt_service": 0}
        )
        assert "error" in result
        assert "dscr" not in result

    def test_negative_input_rejected(self):
        result = compute_dscr.invoke(
            {"ebitda": -1, "existing_annual_debt_service": 1 * BN, "proposed_annual_debt_service": 1 * BN}
        )
        assert "error" in result


class TestComputeLtv:
    def test_known_value(self):
        result = compute_ltv.invoke({"loan_amount": 20 * BN, "collateral_value": 30 * BN})
        assert result["ltv"] == pytest.approx(0.6667, abs=1e-4)

    def test_zero_collateral_errors(self):
        result = compute_ltv.invoke({"loan_amount": 20 * BN, "collateral_value": 0})
        assert "error" in result


class TestComputeExposureRatio:
    def test_known_value(self):
        # 15bn existing + 20bn proposed = 35bn against 200bn capital = 0.175
        result = compute_exposure_ratio.invoke(
            {"existing_exposure": 15 * BN, "proposed_amount": 20 * BN, "bank_own_capital": 200 * BN}
        )
        assert result["exposure_ratio_single_customer"] == 0.175
        assert result["total_exposure"] == 35 * BN

    def test_zero_capital_errors(self):
        result = compute_exposure_ratio.invoke(
            {"existing_exposure": 1 * BN, "proposed_amount": 1 * BN, "bank_own_capital": 0}
        )
        assert "error" in result


class TestComputeAnnualDebtService:
    def test_annuity_known_value(self):
        # 1bn at 12%/yr over 12 months: monthly ≈ 88,848,789 VND
        result = compute_annual_debt_service.invoke({"principal": 1 * BN, "annual_rate": 0.12, "term_months": 12})
        assert result["monthly_payment"] == pytest.approx(88_848_789, rel=1e-4)
        assert result["annual_debt_service"] == pytest.approx(result["monthly_payment"] * 12, rel=1e-9)

    def test_zero_rate_is_straight_division(self):
        result = compute_annual_debt_service.invoke({"principal": 1200, "annual_rate": 0.0, "term_months": 12})
        assert result["monthly_payment"] == 100
        assert result["total_interest"] == 0

    def test_interest_is_positive_when_rate_is(self):
        result = compute_annual_debt_service.invoke({"principal": 20 * BN, "annual_rate": 0.11, "term_months": 60})
        assert result["total_interest"] > 0

    def test_zero_term_errors(self):
        result = compute_annual_debt_service.invoke({"principal": 1 * BN, "annual_rate": 0.1, "term_months": 0})
        assert "error" in result


def test_determinism():
    """Same inputs, same answer — every time. This is the property that lets a bank
    audit a decision, and the reason these live outside the LLM."""
    args = {
        "ebitda": 30 * BN,
        "existing_annual_debt_service": 8 * BN,
        "proposed_annual_debt_service": 12 * BN,
    }
    runs = [compute_dscr.invoke(args)["dscr"] for _ in range(5)]
    assert len(set(runs)) == 1
