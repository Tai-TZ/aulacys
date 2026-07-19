"""Stage-2 Credit proposal (no full graph)."""

from __future__ import annotations

from aulacys.agents.graph import run_credit_proposal
from aulacys.agents.state import DeclaredForm, Document, LoanApplication


def test_run_credit_proposal_returns_loan_proposal() -> None:
    app = LoanApplication(
        product="retail_unsecured_salary",
        declared=DeclaredForm(
            customer_name="NGUYEN VAN A",
            amount=100_000_000,
            term_months=24,
            annual_rate=0.13,
            monthly_income=20_000_000,
            existing_monthly_debt=0,
            declared_purpose="tieu dung",
            id_number="001099000001",
            national_id="001099000001",
            cic_consent=True,
            consent_data_processing=True,
        ),
        documents=[
            Document(kind="cccd", tier=1, extracted={"verified": True}),
            Document(kind="sao_ke_luong", tier=1, extracted={"monthly_income": 20_000_000}),
            Document(kind="cic", tier=1, extracted={"score_band": "A"}),
        ],
    )
    state = run_credit_proposal(app, application_id="demo-proposal")
    assert state["credit"] is not None
    assert state["proposal"] is not None
    assert state.get("compliance") is None
    assert state.get("critic") is None
    assert state.get("ticket") is None
    assert state["metadata"]["stage"] == "rm_proposal"
