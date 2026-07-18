import pytest

from src.agents import graph as graph_module
from src.agents.graph import agent
from src.agents.nodes.operations import OperationsSpec


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
async def test_mortgage_demo_veto_replans_and_writes_ticket():
    result = await agent.ainvoke({"query": "retail mortgage"})

    assert result["application"].product == "retail_mortgage"
    assert result["compliance"].veto is True
    assert "prohibited_purpose_refinance_other_bank" in result["compliance"].rule_ids
    # Hard veto never clears -> loop re-executes up to the cap, then escalates.
    assert result["replan_count"] == 2
    assert result["run_trace"].lane == 3
    assert result["critic"].passed is True  # lane 3 -> Critic runs
    assert result["run_trace"].veto_fired is True
    assert result["ticket"]["status"] == "vetoed"
    assert "write_approval_ticket" in OperationsSpec.tools
    # compliance re-ran each replan: initial + 2 replans = 3 compliance traces.
    assert sum(1 for item in result["trace"] if item.node == "compliance") == 3


@pytest.mark.asyncio
async def test_unsecured_salary_uses_same_graph_without_veto():
    result = await agent.ainvoke({"query": "tín chấp lương"})

    assert result["application"].product == "retail_unsecured_salary"
    assert result["compliance"].veto is False
    assert result["replan_count"] == 0
    assert result["run_trace"].lane == 1
    assert result.get("critic") is None  # lane 1 -> Critic does not run
    assert result["ticket"]["status"] == "stp_approved"


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
