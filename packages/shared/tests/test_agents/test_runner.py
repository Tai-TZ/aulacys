"""Harness runner: deterministic fallback without a key; LLM slot when configured."""

from aulacys.agents.harness.runner import _llm_configured, run
from aulacys.agents.nodes.compliance import ComplianceSpec
from aulacys.agents.nodes.credit import CreditSpec
from aulacys.agents.nodes.operations import OperationsSpec
from aulacys.agents.nodes.planner import PlannerSpec
from aulacys.agents.state import AgentState, LoanApplication
from aulacys.config import get_settings


def _mortgage_state() -> AgentState:
    return {
        "query": "retail mortgage",
        "application": LoanApplication(
            product="retail_mortgage",
            declared={
                "customer_name": "Tran Thi B",
                "amount": 2_500_000_000,
                "term_months": 240,
                "annual_rate": 0.105,
                "monthly_income": 85_000_000,
                "existing_monthly_debt": 8_000_000,
                "declared_purpose": "mua nhà để ở",
                "collateral_value_declared": 4_000_000_000,
            },
            documents=[],
        ),
        "trace": [],
        "replan_count": 0,
        "metadata": {"product_config": {"agents": ["credit", "operations", "compliance"]}},
    }


def test_llm_not_configured_without_key(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    get_settings.cache_clear()
    assert _llm_configured(PlannerSpec) is False


def test_credit_compliance_operations_prose_are_rationale_only():
    assert CreditSpec.llm_prose is True
    assert CreditSpec.prose_fields == ["rationale"]
    assert CreditSpec.model_tier == "mini"
    assert ComplianceSpec.llm_prose is True
    assert ComplianceSpec.prose_fields == ["rationale"]
    assert ComplianceSpec.model_tier == "mini"
    assert OperationsSpec.llm_prose is True
    assert OperationsSpec.prose_fields == ["rationale"]
    assert OperationsSpec.model_tier == "mini"


def test_planner_uses_strong_model_tier_for_prose():
    assert PlannerSpec.model_tier == "strong"
    assert PlannerSpec.prose_fields == ["rationale"]


def test_run_uses_fallback_when_no_api_key(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    get_settings.cache_clear()
    state = _mortgage_state()
    plan = run(PlannerSpec, state)
    assert plan.nodes
    assert state["trace"][-1].fallback_fired is True
