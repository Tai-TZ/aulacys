"""CIC tool contract — cccd + consent; fallback matches cic-svc shape."""

from __future__ import annotations

from aulacys.agents.tools.cic import _normalize, cic_lookup


def test_normalize_adds_overdue_days_alias() -> None:
    out = _normalize({"max_overdue_days": 120, "has_bad_debt": True})
    assert out["overdue_days"] == 120
    assert out["has_bad_debt"] is True


def test_fallback_loads_seed_record() -> None:
    result = cic_lookup.invoke({"cccd": "001099000001", "consent_granted": True})
    assert result["source"] == "seeded_cic_snapshot"
    assert result["cccd"] == "001099000001"
    assert result["record_found"] is True
    assert result["cic_group"] == result["debt_group"]
    assert "overdue_history" in result
    assert result["overdue_days"] == result["max_overdue_days"]
    assert result["dataset_version"].startswith("2026.")


def test_fallback_demo_happy_record() -> None:
    result = cic_lookup.invoke({"cccd": "074300004128", "consent_granted": True})
    assert result["record_found"] is True
    assert result["full_name"] == "NGUYỄN THỊ BÉ HOA"
    assert result["customer_id"] == "CUST-000099"
    assert result["debt_group"] == 1
    assert result["has_bad_debt"] is False

def test_fallback_consent_required() -> None:
    result = cic_lookup.invoke({"cccd": "001099000003", "consent_granted": False})
    assert result["error"] == "consent_required"
    assert result["consent_required"] is True
