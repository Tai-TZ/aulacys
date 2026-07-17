from __future__ import annotations

from src.agents.specs import AgentSpec
from src.agents.state import DAG, AgentState


def planner_fallback(state: AgentState, spec: AgentSpec) -> tuple[DAG, list[str]]:
    config = state.get("metadata", {}).get("product_config", {})
    agents = [str(agent) for agent in config.get("agents", ["credit"])]
    edges: list[tuple[str, str]] = []
    depends = config.get("depends", {}) or {}
    for node, prerequisites in depends.items():
        for prerequisite in prerequisites:
            edges.append((str(prerequisite), str(node)))
    if not edges:
        edges = [("planner", agent) for agent in agents]
    return DAG(nodes=["planner", *agents], edges=edges), []


PlannerSpec = AgentSpec(
    name="planner",
    line=None,
    reads=["application", "metadata", "replan_count"],
    tools=[],
    output=DAG,
    model="deterministic-config",
    max_tool_calls=0,
    prompt="Read product config and produce a DAG. Do not decide business outcome.",
    fallback=planner_fallback,
)
