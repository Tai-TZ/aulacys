import pytest

from src.agents.graph import agent


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
    assert result["ticket"]["status"] == "ready_for_human_approval"
