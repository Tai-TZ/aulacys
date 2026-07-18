"""Product YAML catalogue — every in-scope SKU must load without product branching."""

from __future__ import annotations

import pytest

from aulacys.agents.graph import agent, load_product_config
from aulacys.agents.state import DeclaredForm, Document, LoanApplication
from aulacys.policy.loader import evaluate, load_rules

CATALOG_PRODUCTS = [
    "loan-1",
    "loan-2",
    "loan-house-repair",
    "loan-5",
    "loan-3",
    "loan-4",
    "loan-unsecured-term",
    "loan-unsecured-overdraft",
]


@pytest.mark.parametrize("product_id", CATALOG_PRODUCTS)
def test_catalog_product_yaml_loads(product_id: str) -> None:
    cfg = load_product_config(product_id)
    assert "agents" in cfg
    assert "gate" in cfg
    assert "limits" in cfg


def test_unknown_product_raises() -> None:
    with pytest.raises(ValueError, match="Unknown product"):
        load_product_config("loan-sme-out-of-scope")


def test_product_ltv_cap_rule_exists() -> None:
    ids = {r.id for r in load_rules()}
    assert "max_ltv_product_cap" in ids
    assert "max_amount_product_ceiling" in ids


def test_ltv_within_product_cap_metric() -> None:
    assert evaluate({"ltv_within_product_cap": 1.0}) == []
    violations = evaluate({"ltv_within_product_cap": 0.0})
    assert any(v.rule_id == "max_ltv_product_cap" and v.is_blocking for v in violations)


def test_amount_ceiling_metric() -> None:
    violations = evaluate({"amount_within_product_ceiling": 0.0})
    assert any(v.rule_id == "max_amount_product_ceiling" and v.is_blocking for v in violations)


@pytest.mark.asyncio
async def test_loan_1_over_ltv_vetoes() -> None:
    """loan-1 ltv_cap=0.9; amount/valuation = 0.95 → blocking product-cap veto."""
    app = LoanApplication(
        product="loan-1",
        declared=DeclaredForm(
            customer_name="Tran Thi B",
            amount=3_800_000_000,
            term_months=240,
            annual_rate=0.105,
            monthly_income=85_000_000,
            existing_monthly_debt=8_000_000,
            declared_purpose="mua nhà để ở",
            collateral_value_declared=4_000_000_000,
        ),
        documents=[
            Document(kind="cccd", tier=1, extracted={"verified": True}),
            Document(kind="sao_ke_tai_khoan", tier=1, extracted={"monthly_income": 85_000_000}),
            Document(kind="so_do", tier=2, extracted={"parcel": "DEMO-001"}),
            Document(kind="hop_dong_mua_ban", tier=2, extracted={"seller": "Demo Seller"}),
            Document(kind="cic", tier=1, extracted={"score_band": "A"}),
            # Clean purpose — isolate LTV veto from prohibited-purpose veto.
            Document(kind="purpose_evidence", tier=2, extracted={"actual_purpose": "mua nhà để ở"}),
        ],
    )
    result = await agent.ainvoke({"query": "assess loan-1", "application": app})
    assert result["compliance"].veto is True
    assert "max_ltv_product_cap" in result["compliance"].rule_ids
    assert result["outcome"] == "vetoed"


@pytest.mark.asyncio
async def test_unsecured_term_stp_when_under_ceiling() -> None:
    app = LoanApplication(
        product="loan-unsecured-term",
        declared=DeclaredForm(
            customer_name="Nguyen Van A",
            amount=250_000_000,
            term_months=36,
            annual_rate=0.13,
            monthly_income=35_000_000,
            existing_monthly_debt=3_000_000,
            declared_purpose="tiêu dùng cá nhân",
        ),
        documents=[
            Document(kind="cccd", tier=1, extracted={"verified": True}),
            Document(kind="sao_ke_luong", tier=1, extracted={"monthly_income": 35_000_000}),
            Document(kind="cic", tier=1, extracted={"score_band": "A"}),
        ],
    )
    result = await agent.ainvoke({"query": "assess unsecured", "application": app})
    assert result["compliance"].veto is False
    assert result["outcome"] == "stp_approved"


@pytest.mark.asyncio
async def test_unsecured_term_over_ceiling_vetoes() -> None:
    app = LoanApplication(
        product="loan-unsecured-term",
        declared=DeclaredForm(
            customer_name="Nguyen Van A",
            amount=600_000_000,
            term_months=36,
            annual_rate=0.13,
            monthly_income=35_000_000,
            existing_monthly_debt=3_000_000,
            declared_purpose="tiêu dùng cá nhân",
        ),
        documents=[
            Document(kind="cccd", tier=1, extracted={"verified": True}),
            Document(kind="sao_ke_luong", tier=1, extracted={"monthly_income": 35_000_000}),
            Document(kind="cic", tier=1, extracted={"score_band": "A"}),
        ],
    )
    result = await agent.ainvoke({"query": "assess over ceiling", "application": app})
    assert result["compliance"].veto is True
    assert "max_amount_product_ceiling" in result["compliance"].rule_ids
    assert result["outcome"] == "vetoed"
