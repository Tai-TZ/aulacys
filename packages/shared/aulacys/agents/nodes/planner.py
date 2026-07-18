from __future__ import annotations

from typing import Any

from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import DAG, AgentState


def _planner_metadata(state: AgentState) -> dict[str, Any]:
    metadata = state.setdefault("metadata", {})
    metadata.setdefault("planner_warnings", [])
    return metadata


def _warn(state: AgentState, message: str) -> None:
    _planner_metadata(state)["planner_warnings"].append(message)


def _agent_contracts(state: AgentState) -> dict[str, Any]:
    contracts = _planner_metadata(state).get("agent_contracts", {}) or {}
    return contracts if isinstance(contracts, dict) else {}


def _configured_agents(state: AgentState, config: dict[str, Any]) -> list[str]:
    raw_agents = config.get("agents") or ["credit"]
    contracts = _agent_contracts(state)
    known_agents = set(contracts)
    agents: list[str] = []

    for raw_agent in raw_agents:
        agent = str(raw_agent)
        if known_agents and agent not in known_agents:
            _warn(state, f"Planner skipped unknown agent from product config: {agent}")
            continue
        if agent not in agents:
            agents.append(agent)

    if not agents:
        fallback_agent = "credit"
        _warn(state, f"Planner found no runnable agents; defaulted to {fallback_agent}")
        agents.append(fallback_agent)
    return agents


def _config_dependency_edges(state: AgentState, config: dict[str, Any], agents: list[str]) -> list[tuple[str, str]]:
    agent_set = set(agents)
    depends = config.get("depends", {}) or {}
    edges: list[tuple[str, str]] = []

    for raw_node, raw_prerequisites in depends.items():
        node = str(raw_node)
        if node not in agent_set:
            _warn(state, f"Planner skipped dependency target outside configured agents: {node}")
            continue
        for raw_prerequisite in raw_prerequisites or []:
            prerequisite = str(raw_prerequisite)
            if prerequisite == "planner":
                edges.append(("planner", node))
            elif prerequisite not in agent_set:
                _warn(state, f"Planner skipped dependency {prerequisite} -> {node}; prerequisite is not configured")
            elif prerequisite == node:
                _warn(state, f"Planner skipped self-dependency for agent: {node}")
            else:
                edges.append((prerequisite, node))
    return edges


def _input_dependency_edges(state: AgentState, agents: list[str]) -> list[tuple[str, str]]:
    agent_set = set(agents)
    contracts = _agent_contracts(state)
    edges: list[tuple[str, str]] = []

    for agent in agents:
        contract = contracts.get(agent, {}) or {}
        reads = contract.get("reads", []) if isinstance(contract, dict) else []
        for read_key in reads:
            dependency = str(read_key)
            if dependency in agent_set and dependency != agent:
                edges.append((dependency, agent))
    return edges


def _dedupe_edges(edges: list[tuple[str, str]]) -> list[tuple[str, str]]:
    deduped: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for edge in edges:
        if edge not in seen:
            deduped.append(edge)
            seen.add(edge)
    return deduped


def _build_edges(state: AgentState, config: dict[str, Any], agents: list[str]) -> list[tuple[str, str]]:
    dependency_edges = _config_dependency_edges(state, config, agents)
    dependency_edges.extend(_input_dependency_edges(state, agents))
    incoming = {node for _, node in dependency_edges}
    root_edges = [("planner", agent) for agent in agents if agent not in incoming]
    return _dedupe_edges([*root_edges, *dependency_edges])


def _rationale(state: AgentState, agents: list[str], edges: list[tuple[str, str]]) -> str:
    app = state.get("application")
    product = getattr(app, "product", "unknown")
    roots = [node for source, node in edges if source == "planner"]
    base = (
        f"Planner built a DAG for {product} from product config agents={agents}. "
        f"Parallel roots={roots}; downstream edges={[(src, dst) for src, dst in edges if src != 'planner']}. "
        "Planner does not compute figures, approve, veto, or call tools."
    )
    if int(state.get("replan_count", 0)) <= 0:
        return base

    compliance = state.get("compliance")
    rule_ids = getattr(compliance, "rule_ids", []) if compliance else []
    veto_note = f" Veto rules={rule_ids}." if rule_ids else ""
    return (
        "Compliance veto returned control to Planner; Planner rebuilt the DAG from the same product config "
        f"before re-execution.{veto_note} " + base
    )


def planner_fallback(state: AgentState, spec: AgentSpec) -> tuple[DAG, list[str]]:
    config = _planner_metadata(state).get("product_config", {}) or {}
    agents = _configured_agents(state, config)
    edges = _build_edges(state, config, agents)
    return DAG(nodes=["planner", *agents], edges=edges, rationale=_rationale(state, agents, edges)), []


PlannerSpec = AgentSpec(
    name="planner",
    line=None,
    reads=["application", "metadata", "replan_count"],
    tools=[],
    output=DAG,
    model="deterministic-config",
    model_tier="strong",
    max_tool_calls=0,
    prompt="Read product config and produce a DAG. Do not decide business outcome.",
    fallback=planner_fallback,
    llm_prose=True,
    prose_fields=["rationale"],
)
