"""Tests for policy-svc engine + routes."""

from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient

from app.main import app
from app.services import engine

client = TestClient(app)


def test_future_rules_gated_by_as_of() -> None:
    violations = engine.evaluate({"dti": 0.9}, as_of=date(2025, 12, 31))
    assert violations == []


def test_blocking_exposure_veto() -> None:
    violations = engine.evaluate({"exposure_ratio_single_customer": 0.175})
    assert len(violations) == 1
    assert violations[0].rule_id == "single_customer_credit_limit"
    assert violations[0].is_blocking


def test_unverified_rules_surfaced() -> None:
    unverified = {r.id for r in engine.unverified_rules()}
    assert "prohibited_purpose_refinance_other_bank" in unverified
    assert "single_customer_credit_limit" not in unverified


def test_evaluate_route_veto_flag() -> None:
    resp = client.post(
        "/evaluate",
        json={"metrics": {"exposure_ratio_single_customer": 0.175}},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["veto"] is True
    assert "single_customer_credit_limit" in body["rule_ids"]


def test_health_unverified_list() -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert "prohibited_purpose_refinance_other_bank" in resp.json()["unverified_rules"]


def test_unverified_rule_never_auto_vetoes() -> None:
    violations = engine.evaluate({"prohibited_purpose_refinance_other_bank": 1})

    purpose = next(v for v in violations if v.rule_id == "prohibited_purpose_refinance_other_bank")
    assert purpose.unverified is True
    assert purpose.severity == "warning"
    assert purpose.is_blocking is False
