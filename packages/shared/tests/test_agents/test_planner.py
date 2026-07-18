from __future__ import annotations

from aulacys.agents.nodes.planner import PlannerSpec
from aulacys.agents.nodes.planner import planner_fallback
from aulacys.agents.state import ComplianceVerdict, DeclaredForm, Document, LoanApplication


AGENT_CONTRACTS = {
    "credit": {"reads": ["application"]},
    "operations": {"reads": ["application", "metadata"]},
    "compliance": {"reads": ["application", "credit", "operations"]},
}


def _application(product: str = "retail_mortgage") -> LoanApplication:
    return LoanApplication(
        product=product,
        declared=DeclaredForm(
            customer_name="Tran Thi B",
            amount=2_500_000_000,
            term_months=240,
            annual_rate=0.105,
            monthly_income=85_000_000,
            existing_monthly_debt=8_000_000,
            declared_purpose="mua nha de o",
        ),
        documents=[Document(kind="cccd", tier=1, extracted={"verified": True})],
    )


def test_planner_builds_parallel_roots_and_data_edges() -> None:
    state = {
        "application": _application(),
        "metadata": {
            "product_config": {
                "agents": ["credit", "operations", "compliance"],
                "depends": {"compliance": ["operations"]},
            },
            "agent_contracts": AGENT_CONTRACTS,
        },
        "replan_count": 0,
    }

    plan, tool_calls = planner_fallback(state, PlannerSpec)

    assert tool_calls == []
    assert plan.nodes == ["planner", "credit", "operations", "compliance"]
    assert plan.edges == [
        ("planner", "credit"),
        ("planner", "operations"),
        ("operations", "compliance"),
        ("credit", "compliance"),
    ]
    assert plan.plan_id.startswith("retail_mortgage:r0:")
    assert len(plan.plan_hash) == 64
    assert plan.warnings == []
    assert state["metadata"]["planner_plan_trace"][-1]["plan_hash"] == plan.plan_hash
    assert "does not compute figures, approve, veto, or call tools" in plan.rationale


def test_planner_replan_rationale_carries_veto_rules_without_deciding_outcome() -> None:
    state = {
        "application": _application(),
        "metadata": {
            "product_config": {"agents": ["credit", "compliance"]},
            "agent_contracts": AGENT_CONTRACTS,
        },
        "compliance": ComplianceVerdict(
            violations=[],
            veto=True,
            rule_ids=["max_amount_product_ceiling"],
            citations=[],
        ),
        "replan_count": 1,
    }

    plan, _ = planner_fallback(state, PlannerSpec)

    assert plan.edges == [("planner", "credit"), ("credit", "compliance")]
    assert plan.plan_id.startswith("retail_mortgage:r1:")
    assert "Compliance veto returned control to Planner" in plan.rationale
    assert "max_amount_product_ceiling" in plan.rationale
    assert "approve" in plan.rationale


def test_planner_warns_and_skips_unknown_dependency() -> None:
    state = {
        "application": _application("retail_unsecured_salary"),
        "metadata": {
            "product_config": {
                "agents": ["credit", "unknown_agent", "compliance"],
                "depends": {"compliance": ["unknown_agent", "credit"], "ghost": ["credit"]},
            },
            "agent_contracts": AGENT_CONTRACTS,
        },
        "replan_count": 0,
    }

    plan, _ = planner_fallback(state, PlannerSpec)

    assert plan.nodes == ["planner", "credit", "compliance"]
    assert plan.edges == [("planner", "credit"), ("credit", "compliance")]
    warnings = plan.warnings
    assert any("unknown agent" in warning for warning in warnings)
    assert any("prerequisite is not configured" in warning for warning in warnings)
    assert any("target outside configured agents" in warning for warning in warnings)


def test_planner_hash_is_stable_for_same_structural_plan() -> None:
    state = {
        "application": _application(),
        "metadata": {
            "product_config": {
                "agents": ["credit", "operations", "compliance"],
                "depends": {"compliance": ["operations"]},
            },
            "agent_contracts": AGENT_CONTRACTS,
        },
        "replan_count": 0,
    }

    first, _ = planner_fallback(state, PlannerSpec)
    second, _ = planner_fallback(state, PlannerSpec)

    assert first.plan_hash == second.plan_hash
    assert first.plan_id == second.plan_id
    assert len(state["metadata"]["planner_plan_trace"]) == 2


def test_planner_warns_on_cycle_before_graph_execution() -> None:
    state = {
        "application": _application("retail_unsecured_salary"),
        "metadata": {
            "product_config": {
                "agents": ["credit", "compliance"],
                "depends": {"credit": ["compliance"], "compliance": ["credit"]},
            },
            "agent_contracts": AGENT_CONTRACTS,
        },
        "replan_count": 0,
    }

    plan, _ = planner_fallback(state, PlannerSpec)

    assert not any(source == "planner" for source, _ in plan.edges)
    assert any("dependency cycle" in warning for warning in plan.warnings)
    assert any("no runnable root" in warning for warning in plan.warnings)
