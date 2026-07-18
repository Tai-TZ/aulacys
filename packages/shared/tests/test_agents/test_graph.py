import pytest

from aulacys.agents import graph as graph_module
from aulacys.agents.graph import _agent_execution_order, agent
from aulacys.agents.state import DAG
from aulacys.agents.nodes.compliance import ComplianceSpec
from aulacys.agents.nodes.credit import CreditSpec
from aulacys.agents.nodes.critic import CriticSpec
from aulacys.agents.nodes.operations import OperationsSpec
from aulacys.agents.nodes.planner import PlannerSpec


@pytest.mark.asyncio
async def test_agent_basic_flow():
    result = await agent.ainvoke({"query": "Hello"})
    assert "response" in result


@pytest.mark.asyncio
async def test_agent_state_structure():
    result = await agent.ainvoke({"query": "Test query"})
    assert isinstance(result, dict)
    assert "query" in result


@pytest.mark.asyncio
async def test_mortgage_purpose_contradiction_vetoes_and_replans():
    """Wow path: purpose evidence contradiction → blocking veto → Planner replan loop."""
    result = await agent.ainvoke({"query": "retail mortgage"})

    assert result["application"].product == "retail_mortgage"
    assert result["compliance"].veto is True
    assert "prohibited_purpose_refinance_other_bank" in result["compliance"].rule_ids
    violation = next(
        v for v in result["compliance"].violations if v.rule_id == "prohibited_purpose_refinance_other_bank"
    )
    assert violation.unverified is False
    assert violation.severity == "blocking"
    assert result["replan_count"] >= 1
    assert result["run_trace"].veto_fired is True
    assert result["outcome"] == "vetoed"
    assert result["ticket"]["status"] == "vetoed"
    assert result["credit"].proposed_limit is not None
    assert "price_loan" in result["credit"].tool_results
    assert result["operations"].valuation_task["status"] == "scheduled"
    assert "kyc_check" in result["compliance"].tool_results


@pytest.mark.asyncio
async def test_unsecured_purpose_veto_seed_blocks():
    result = await agent.ainvoke({"query": "tín chấp veto"})

    assert result["application"].product == "retail_unsecured_salary"
    assert result["compliance"].veto is True
    assert "prohibited_purpose_refinance_other_bank" in result["compliance"].rule_ids
    assert result["run_trace"].veto_fired is True
    assert result["outcome"] == "vetoed"


@pytest.mark.asyncio
async def test_unsecured_salary_uses_same_graph_without_veto():
    result = await agent.ainvoke({"query": "tín chấp lương"})

    assert result["application"].product == "retail_unsecured_salary"
    assert result["compliance"].veto is False
    assert result["replan_count"] == 0
    report = result["compliance"].tool_results["metric_report"]
    assert report["complete"] is True
    assert report["missing"] == []
    assert report["facts"]["dti"]["source"] == "compute_dti"
    assert result["run_trace"].lane == 1
    assert result.get("critic") is None  # lane 1 -> Critic does not run
    assert result["ticket"]["status"] == "stp_approved"
    assert result["credit"].proposed_limit == 150_000_000
    assert "price_loan" in result["credit"].tool_results


@pytest.mark.asyncio
async def test_agent_execution_uses_dag_dependencies(monkeypatch):
    original_load_product_config = graph_module.load_product_config
    config = original_load_product_config("retail_mortgage").copy()
    config["agents"] = ["compliance", "operations", "credit"]

    def fake_load_product_config(product: str):
        if product == "retail_mortgage":
            return config
        return original_load_product_config(product)

    monkeypatch.setattr(graph_module, "load_product_config", fake_load_product_config)

    result = await agent.ainvoke({"query": "retail mortgage"})

    first_cycle = [item.node for item in result["trace"] if item.node in {"credit", "operations", "compliance"}][:3]
    assert first_cycle.index("credit") < first_cycle.index("compliance")
    assert first_cycle.index("operations") < first_cycle.index("compliance")
    assert "dti" in result["compliance"].tool_results["metrics"]


@pytest.mark.asyncio
async def test_agent_execution_warns_on_dag_cycle(monkeypatch):
    original_load_product_config = graph_module.load_product_config
    config = original_load_product_config("retail_unsecured_salary").copy()
    config["depends"] = {"credit": ["compliance"], "compliance": ["credit"]}

    def fake_load_product_config(product: str):
        if product == "retail_unsecured_salary":
            return config
        return original_load_product_config(product)

    monkeypatch.setattr(graph_module, "load_product_config", fake_load_product_config)

    result = await agent.ainvoke({"query": "tín chấp lương"})

    assert "DAG dependency cycle" in result["metadata"]["graph_warnings"][0]


def test_agent_specs_match_role_permission_contract():
    assert PlannerSpec.tools == []
    assert CreditSpec.tools == ["core_banking_read", "loan_calculator"]
    assert ComplianceSpec.tools == ["core_banking_read", "aml_screening"]
    assert OperationsSpec.tools == ["core_banking_read", "workflow_write"]
    assert CriticSpec.tools == []


def test_graph_execution_order_uses_planner_dag_only():
    config = {"agents": ["compliance", "credit"]}
    state = {
        "metadata": {},
        "plan": DAG(
            nodes=["planner", "compliance", "credit"], edges=[("planner", "compliance"), ("planner", "credit")]
        ),
    }

    assert _agent_execution_order(state, config) == ["compliance", "credit"]
