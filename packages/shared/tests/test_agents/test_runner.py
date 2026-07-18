"""Harness runner: deterministic fallback without a key; LLM slot when configured."""

from aulacys.agents.harness.runner import _llm_configured, run
from aulacys.agents.nodes.credit import CreditSpec
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


def test_number_spec_never_calls_llm_even_with_key(monkeypatch):
    """P0-2 guard: a number/veto-bearing spec (llm_prose=False) stays deterministic
    even when a key is present. Only prose specs may reach the model."""
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    get_settings.cache_clear()
    assert CreditSpec.llm_prose is False
    assert _llm_configured(CreditSpec) is False
    get_settings.cache_clear()


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
