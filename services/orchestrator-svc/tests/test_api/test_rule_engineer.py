"""Rule Engineer — list / patch appetite / validate by package profile."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from aulacys.policy import loader as loader_mod
from aulacys.policy.loader import (
    _clear_override_cache,
    evaluate,
    list_rules_for_profile,
    load_appetite_overrides,
    patch_appetite_threshold,
)

client = TestClient(app)


def _passing_secured_metrics() -> dict[str, float]:
    return {
        "kyc_verified": 1,
        "ubo_clear": 1,
        "ekyc_face_match_ok": 1,
        "geo_within_radius": 1,
        "age_at_maturity_ok": 1,
        "income_meets_regional_min": 1,
        "prohibited_purpose_refinance_other_bank": 0,
        "ltv_within_product_cap": 1,
        "land_registry_ok": 1,
        "dti": 0.35,
        "cic_group": 1,
        "has_bad_debt": 0,
        "docs_complete": 1,
        "term_within_product_max": 1,
        "income_verified": 1,
        "sanctions_match_count": 0,
        "pep_match_count": 0,
        "aml_screening_complete": 1,
    }


def test_secured_profile_includes_purpose_ban() -> None:
    ids = {r["id"] for r in list_rules_for_profile("secured")}
    assert "prohibited_purpose_refinance_other_bank" in ids
    assert "max_ltv_product_cap" in ids
    assert "max_cic_group" in ids
    assert "docs_complete" in ids
    assert "land_title_clear" in ids
    assert "kyc_identity_verified" in ids
    assert "ubo_related_control_clear" in ids
    assert "max_amount_product_ceiling" not in ids


def test_unsecured_profile_has_amount_ceiling() -> None:
    ids = {r["id"] for r in list_rules_for_profile("unsecured")}
    assert "max_amount_product_ceiling" in ids
    assert "max_cic_group" in ids
    assert "income_verified" in ids
    assert "kyc_identity_verified" in ids
    assert "ubo_related_control_clear" in ids
    assert "prohibited_purpose_refinance_other_bank" in ids
    assert "land_title_clear" not in ids


def test_legal_rules_not_editable() -> None:
    by_id = {r["id"]: r for r in list_rules_for_profile("secured")}
    assert by_id["prohibited_purpose_refinance_other_bank"]["editable"] is False
    assert by_id["max_retail_dti"]["editable"] is True
    assert by_id["max_cic_group"]["editable"] is True


def test_patch_dti_appetite_and_evaluate(tmp_path, monkeypatch) -> None:
    overrides = tmp_path / "appetite_overrides.yaml"
    overrides.write_text("overrides: {}\nproducts: {}\n", encoding="utf-8")
    monkeypatch.setattr(loader_mod, "OVERRIDES_PATH", overrides)
    _clear_override_cache()

    patch_appetite_threshold("secured", "max_retail_dti", 0.4)
    assert load_appetite_overrides()["secured"]["max_retail_dti"] == 0.4

    # 0.45 fails against 0.4 appetite
    violations = evaluate({"dti": 0.45}, profile="secured")
    assert any(v.rule_id == "max_retail_dti" for v in violations)

    # restore softer threshold so other tests aren't poisoned if cache shared
    patch_appetite_threshold("secured", "max_retail_dti", 0.5)
    _clear_override_cache()


def test_product_code_override_wins(tmp_path, monkeypatch) -> None:
    overrides = tmp_path / "appetite_overrides.yaml"
    overrides.write_text("overrides: {}\nproducts: {}\n", encoding="utf-8")
    monkeypatch.setattr(loader_mod, "OVERRIDES_PATH", overrides)
    _clear_override_cache()

    patch_appetite_threshold("unsecured", "max_cic_group", 3, product_code="IND_SALARY_01")
    # Profile default still 2
    rows_default = {r["id"]: r for r in list_rules_for_profile("unsecured")}
    assert rows_default["max_cic_group"]["threshold"] == 2
    # Product override
    rows_prod = {r["id"]: r for r in list_rules_for_profile("unsecured", product_code="IND_SALARY_01")}
    assert rows_prod["max_cic_group"]["threshold"] == 3
    violations = evaluate({"cic_group": 3}, profile="unsecured", product_code="IND_SALARY_01")
    assert not any(v.rule_id == "max_cic_group" for v in violations)
    violations_strict = evaluate({"cic_group": 3}, profile="unsecured")
    assert any(v.rule_id == "max_cic_group" for v in violations_strict)


def test_cannot_patch_legal_rule(tmp_path, monkeypatch) -> None:
    overrides = tmp_path / "appetite_overrides.yaml"
    overrides.write_text("overrides: {}\n", encoding="utf-8")
    monkeypatch.setattr(loader_mod, "OVERRIDES_PATH", overrides)
    _clear_override_cache()

    from aulacys.policy.loader import AppetitePatchError

    try:
        patch_appetite_threshold("secured", "prohibited_purpose_refinance_other_bank", 1)
        raise AssertionError("expected AppetitePatchError")
    except AppetitePatchError:
        pass


def test_list_rules_route() -> None:
    resp = client.get("/api/v1/policy/rules", params={"secured_type": "SECURED"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["profile"] == "secured"
    assert any(r["id"] == "max_retail_dti" for r in body["rules"])
    assert any(r["id"] == "max_cic_group" for r in body["rules"])
    assert any(r["label_vi"] for r in body["rules"])


def test_validate_route_veto() -> None:
    metrics = _passing_secured_metrics()
    metrics["cic_group"] = 5
    resp = client.post(
        "/api/v1/policy/rules/validate",
        params={"secured_type": "SECURED"},
        json={"metrics": metrics},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["veto"] is True
    assert "max_cic_group" in body["rule_ids"]


def test_profile_evaluate_skips_unrelated_corporate_rules() -> None:
    # Exposure over limit must NOT fire on secured retail profile (not in set).
    metrics = _passing_secured_metrics()
    metrics["exposure_ratio_single_customer"] = 0.99
    violations = evaluate(metrics, profile="secured")
    assert violations == []


def test_profile_missing_metric_fails_closed() -> None:
    metrics = _passing_secured_metrics()
    del metrics["income_verified"]

    violations = evaluate(metrics, profile="secured")

    missing = next(v for v in violations if v.rule_id == "income_verified")
    assert missing.missing_metric is True
    assert missing.actual is None
    assert missing.is_blocking


def test_prohibited_purpose_is_blocking_veto() -> None:
    metrics = _passing_secured_metrics()
    metrics["prohibited_purpose_refinance_other_bank"] = 1

    violations = evaluate(metrics, profile="secured")

    purpose = next(v for v in violations if v.rule_id == "prohibited_purpose_refinance_other_bank")
    assert purpose.unverified is False
    assert purpose.severity == "blocking"
    assert purpose.is_blocking is True


def test_rejects_out_of_range_ratio_threshold(tmp_path, monkeypatch) -> None:
    overrides = tmp_path / "appetite_overrides.yaml"
    overrides.write_text("overrides: {}\n", encoding="utf-8")
    monkeypatch.setattr(loader_mod, "OVERRIDES_PATH", overrides)
    _clear_override_cache()

    from aulacys.policy.loader import AppetitePatchError

    try:
        patch_appetite_threshold("secured", "max_retail_dti", 1.5)
        raise AssertionError("expected AppetitePatchError")
    except AppetitePatchError as exc:
        assert "between 0 and 1" in str(exc)


def test_delete_appetite_override(tmp_path, monkeypatch) -> None:
    from aulacys.policy.loader import delete_appetite_override

    overrides = tmp_path / "appetite_overrides.yaml"
    overrides.write_text("overrides: {}\nproducts: {}\n", encoding="utf-8")
    monkeypatch.setattr(loader_mod, "OVERRIDES_PATH", overrides)
    _clear_override_cache()

    # Apply override
    patch_appetite_threshold("secured", "max_retail_dti", 0.4)
    assert load_appetite_overrides()["secured"]["max_retail_dti"] == 0.4

    # Delete override
    delete_appetite_override("secured", "max_retail_dti")
    assert "secured" not in load_appetite_overrides() or "max_retail_dti" not in load_appetite_overrides().get("secured", {})


def test_delete_route(tmp_path, monkeypatch) -> None:
    # Setup custom override file
    overrides = tmp_path / "appetite_overrides.yaml"
    overrides.write_text("overrides: {}\nproducts: {}\n", encoding="utf-8")
    monkeypatch.setattr(loader_mod, "OVERRIDES_PATH", overrides)
    _clear_override_cache()

    # Patch first
    patch_appetite_threshold("secured", "max_retail_dti", 0.4)

    # Delete via API
    resp = client.delete(
        "/api/v1/policy/rules/max_retail_dti",
        params={"secured_type": "SECURED"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["threshold"] == 0.5  # Reverted back to default 0.5

