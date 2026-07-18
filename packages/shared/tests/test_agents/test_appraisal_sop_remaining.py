"""SOP appraisal tools — age, income multiple, purpose tenor, DTI band, disposable buffer."""

from __future__ import annotations

from aulacys.agents.tools.appraisal import (
    age_at_maturity_check,
    amount_within_income_multiple,
    disposable_income_buffer,
    dti_cap_for_income,
    dti_within_income_band,
    term_matches_purpose,
)


def test_age_at_maturity_bounds():
    ok = age_at_maturity_check.invoke(
        {"dob": "10/06/2000", "term_months": 36, "as_of": "2026-07-19"}
    )
    assert ok["within_range"] is True
    assert ok["age_now"] >= 22
    assert ok["age_at_maturity"] <= 60

    old = age_at_maturity_check.invoke(
        {"dob": "01/01/1970", "term_months": 240, "as_of": "2026-07-19"}
    )
    assert old["within_range"] is False


def test_income_multiple_and_purpose_tenor():
    within = amount_within_income_multiple.invoke(
        {"requested_amount": 150_000_000, "verified_monthly_income": 22_000_000}
    )
    assert within["within_limit"] is True
    assert within["income_multiple"] <= 12

    over = amount_within_income_multiple.invoke(
        {"requested_amount": 400_000_000, "verified_monthly_income": 22_000_000}
    )
    assert over["within_limit"] is False

    large = term_matches_purpose.invoke(
        {"term_months": 36, "declared_purpose": "Mua sắm nội thất, tiêu dùng cá nhân"}
    )
    assert large["purpose_band"] == "large"
    assert large["matches"] is True

    small = term_matches_purpose.invoke(
        {"term_months": 24, "declared_purpose": "Tiêu dùng cá nhân"}
    )
    assert small["purpose_band"] == "small"
    assert small["matches"] is True

    mismatch = term_matches_purpose.invoke(
        {"term_months": 48, "declared_purpose": "Tiêu dùng cá nhân"}
    )
    assert mismatch["matches"] is False


def test_dti_bands_and_disposable_buffer():
    assert dti_cap_for_income(8_000_000) == 0.35
    assert dti_cap_for_income(20_000_000) == 0.45
    assert dti_cap_for_income(40_000_000) == 0.55

    ok = dti_within_income_band.invoke({"dti": 0.40, "verified_monthly_income": 20_000_000})
    assert ok["within_band"] is True
    bad = dti_within_income_band.invoke({"dti": 0.40, "verified_monthly_income": 8_000_000})
    assert bad["within_band"] is False

    buffer_ok = disposable_income_buffer.invoke(
        {
            "verified_monthly_income": 22_000_000,
            "monthly_debt": 10_000_000,
        }
    )
    assert buffer_ok["meets_buffer"] is True
    buffer_bad = disposable_income_buffer.invoke(
        {
            "verified_monthly_income": 10_000_000,
            "monthly_debt": 8_000_000,
        }
    )
    assert buffer_bad["meets_buffer"] is False
