"""Appraisal criteria tools: eKYC, geo radius, regional income floor."""

from __future__ import annotations

from aulacys.agents.tools.ekyc import ekyc_face_match
from aulacys.agents.tools.geo import geo_radius_check
from aulacys.agents.tools.regional_income import (
    FLOOR_HN_HCM_VND,
    FLOOR_OTHER_VND,
    extract_province_from_address,
    regional_income_check,
    regional_income_floor,
)


def test_ekyc_face_match_pass_and_fail():
    good = ekyc_face_match.invoke(
        {"id_number": "001099000001", "avatar": "/aulacys/avatars/CUST-000001.jpg"}
    )
    assert good["record_found"] is True
    assert good["avatar_matched"] is True
    assert good["face_match_score"] >= 85
    assert good["passed"] is True
    assert good["enrolled_avatar"] == "/aulacys/avatars/CUST-000001.jpg"

    bad = ekyc_face_match.invoke(
        {"id_number": "001099000010", "avatar": "/aulacys/avatars/CUST-000010.jpg"}
    )
    assert bad["face_match_score"] < 85
    assert bad["passed"] is False


def test_ekyc_avatar_mismatch_fails():
    mismatch = ekyc_face_match.invoke(
        {"id_number": "001099000001", "avatar": "/aulacys/avatars/OTHER.jpg"}
    )
    assert mismatch["avatar_matched"] is False
    assert mismatch["passed"] is False
    assert mismatch["reason"] == "avatar_mismatch"


def test_ekyc_missing_fails_closed():
    missing = ekyc_face_match.invoke({"id_number": "999999999999", "avatar": "/x.jpg"})
    assert missing["passed"] is False
    assert missing["reason"] in {"missing_enrolled_avatar", "missing_face_match_score"}


def test_geo_within_and_outside_radius():
    near = geo_radius_check.invoke({"id_number": "001099000001", "max_km": 50})
    assert near["within_radius"] is True
    assert near["distance_km"] is not None
    assert near["distance_km"] <= 50

    # Same customer, tighter radius → outside (deterministic without fabricating people).
    tight = geo_radius_check.invoke({"id_number": "001099000001", "max_km": 0.01})
    assert tight["within_radius"] is False
    assert tight["distance_km"] > 0.01

    missing = geo_radius_check.invoke({"id_number": "999999999999", "max_km": 50})
    assert missing["record_found"] is False
    assert missing["within_radius"] is False


def test_regional_income_floors():
    assert regional_income_floor("Hà Nội") == ("hanoi_hcm", FLOOR_HN_HCM_VND)
    assert regional_income_floor("TP. Hồ Chí Minh") == ("hanoi_hcm", FLOOR_HN_HCM_VND)
    assert regional_income_floor("Đà Nẵng") == ("other_province", FLOOR_OTHER_VND)
    assert extract_province_from_address("Số 11, Phường 2, Hà Nội") == "Hà Nội"

    ok = regional_income_check.invoke(
        {"province": "Hà Nội", "verified_monthly_income": 8_000_000}
    )
    assert ok["meets_minimum"] is True
    low = regional_income_check.invoke(
        {"province": "Hà Nội", "verified_monthly_income": 5_000_000}
    )
    assert low["meets_minimum"] is False
    other_ok = regional_income_check.invoke(
        {"province": "Đà Nẵng", "verified_monthly_income": 5_000_000}
    )
    assert other_ok["meets_minimum"] is True
