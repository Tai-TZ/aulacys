from __future__ import annotations

from aulacys.agents.nodes.critic import CriticSpec, critic_fallback
from aulacys.agents.state import (
    Citation,
    CreditAssessment,
    ComplianceVerdict,
    LoanProposal,
    OperationsReport,
)
from aulacys.policy.loader import PolicyViolation


def test_critic_passes_when_tool_evidence_complete() -> None:
    state = {
        "credit": CreditAssessment(
            dti=0.3,
            income=20_000_000,
            proposed_limit=100_000_000,
            proposed_rate=0.13,
            recommendation="support",
            evidence=[],
            tool_results={
                "cic_lookup": {"cic_group": 1},
                "income_verify": {"verified_monthly_income": 20_000_000},
                "compute_dti": {"dti": 0.3},
                "compute_annual_debt_service": {"monthly_payment": 5_000_000},
                "price_loan": {"proposed_limit": 100_000_000, "proposed_rate": 0.13},
            },
            proposal=LoanProposal(
                requested_amount=100_000_000,
                proposed_limit=100_000_000,
                proposed_rate=0.13,
                term_months=24,
                monthly_payment=5_000_000,
                dti=0.3,
                status="accepted",
                revisions=[],
            ),
        ),
        "operations": OperationsReport(
            valuation=None,
            doc_status="complete",
            missing=[],
            legal_flags=[],
            evidence=[],
            tool_results={"doc_checklist": {"status": "complete"}},
        ),
        "compliance": ComplianceVerdict(
            violations=[],
            veto=False,
            rule_ids=[],
            kyc_status="passed",
            ubo_status="not_applicable",
            citations=[],
            tool_results={"kyc_check": {"status": "passed"}, "ubo_check": {"status": "not_applicable"}},
        ),
    }

    verdict, tools = critic_fallback(state, CriticSpec)
    assert tools == []
    assert verdict.passed is True
    assert verdict.rejections == []


def test_critic_rejects_missing_dti_tool_and_proposal_mismatch() -> None:
    state = {
        "credit": CreditAssessment(
            dti=0.4,
            income=20_000_000,
            proposed_limit=80_000_000,
            proposed_rate=0.14,
            recommendation="manual_review",
            evidence=[],
            tool_results={
                "cic_lookup": {},
                "income_verify": {"verified_monthly_income": 20_000_000},
                "price_loan": {"proposed_limit": 80_000_000},
            },
        ),
        "proposal": LoanProposal(
            requested_amount=100_000_000,
            proposed_limit=70_000_000,
            proposed_rate=0.14,
            term_months=24,
            monthly_payment=1.0,
            dti=0.4,
            status="revised",
            revisions=["Limit reduced"],
        ),
    }

    verdict, _ = critic_fallback(state, CriticSpec)
    assert verdict.passed is False
    assert any("compute_dti" in item for item in verdict.rejections)
    assert any("proposed_limit" in item for item in verdict.rejections)


def test_critic_requires_policy_citation_on_veto() -> None:
    state = {
        "compliance": ComplianceVerdict(
            violations=[
                PolicyViolation(
                    rule_id="prohibited_purpose_refinance_other_bank",
                    description="purpose",
                    legal_basis="demo",
                    metric="prohibited_purpose_refinance_other_bank",
                    actual=1.0,
                    threshold=0.0,
                    operator="==",
                    unit="boolean_flag",
                    severity="blocking",
                    raised_by="compliance",
                    effective_from="2024-01-01",
                    version="demo-1.1",
                )
            ],
            veto=True,
            rule_ids=["prohibited_purpose_refinance_other_bank"],
            kyc_status="passed",
            ubo_status="passed",
            citations=[Citation(source="other", reference="x")],
            tool_results={
                "kyc_check": {},
                "ubo_check": {},
                "metrics": {"prohibited_purpose_refinance_other_bank": 1.0},
            },
        )
    }

    verdict, _ = critic_fallback(state, CriticSpec)
    assert verdict.passed is False
    assert any("policy.evaluate" in item for item in verdict.rejections)


def test_critic_spec_locks_memo_from_llm_rewrite() -> None:
    assert CriticSpec.llm_prose is True
    # memo, passed, rejections stay deterministic (audit-backed); only review + remediation
    # prose may be LLM-written.
    assert CriticSpec.prose_fields == ["review", "remediation_plan"]
    assert "memo" not in CriticSpec.prose_fields
    assert "passed" not in CriticSpec.prose_fields
    assert "proposal" in CriticSpec.reads
    assert CriticSpec.tools == []


def test_critic_review_is_populated_deterministically() -> None:
    # Even with no LLM, review carries a non-empty independent critique.
    verdict, _ = critic_fallback({}, CriticSpec)
    assert isinstance(verdict.review, str) and verdict.review.strip()
