from __future__ import annotations

import pytest

from aulacys.agents.graph import agent
from aulacys.agents.state import DeclaredForm, Document, LoanApplication


@pytest.mark.asyncio
async def test_happy_seed_builds_accepted_loan_proposal() -> None:
    result = await agent.ainvoke({"query": "tín chấp lương"})

    proposal = result["proposal"]

    assert proposal.status == "accepted"
    assert proposal.requested_amount == 150_000_000
    assert proposal.proposed_limit == 150_000_000
    assert proposal.proposed_rate == 0.13
    assert proposal.term_months == 36
    assert proposal.monthly_payment is not None
    assert proposal.dti == result["credit"].dti
    assert proposal.revisions == []
    assert result["credit"].proposal == proposal
    assert result["ticket"]["status"] == "stp_approved"


@pytest.mark.asyncio
async def test_hitl_seed_builds_revised_loan_proposal() -> None:
    result = await agent.ainvoke({"query": "hitl"})

    proposal = result["proposal"]

    assert proposal.status == "revised"
    assert proposal.requested_amount == 200_000_000
    assert proposal.proposed_limit is not None
    assert proposal.proposed_limit < proposal.requested_amount
    assert proposal.proposed_rate is not None
    assert proposal.monthly_payment is not None
    assert proposal.dti is not None
    assert any("Limit reduced" in revision for revision in proposal.revisions)
    assert result["credit"].recommendation == "manual_review"


@pytest.mark.asyncio
async def test_compliance_veto_still_vetoes_with_proposal_present() -> None:
    application = LoanApplication(
        product="retail_unsecured_salary",
        declared=DeclaredForm(
            customer_name="Consent Block",
            amount=100_000_000,
            term_months=24,
            annual_rate=0.13,
            monthly_income=20_000_000,
            existing_monthly_debt=0,
            declared_purpose="Tiêu dùng cá nhân",
            id_number="001099000001",
            cic_consent=False,
            consent_data_processing=False,
        ),
        documents=[
            Document(kind="cccd", tier=1, extracted={"verified": True}),
            Document(kind="sao_ke_luong", tier=1, extracted={"monthly_income": 20_000_000}),
            Document(kind="cic", tier=1, extracted={"score_band": "A"}),
        ],
    )

    result = await agent.ainvoke({"query": "consent veto", "application": application})

    assert result["proposal"].status == "rejected"
    assert result["credit"].recommendation == "manual_review"
    assert result["compliance"].veto is True
    assert result["compliance"].rule_ids
    assert result["outcome"] == "vetoed"
    assert result["ticket"]["status"] == "vetoed"
