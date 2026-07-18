from __future__ import annotations

import hashlib
import json
from typing import Any

from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import DAG, AgentState


def _planner_metadata(state: AgentState) -> dict[str, Any]:
    metadata = state.setdefault("metadata", {})
    metadata.setdefault("planner_warnings", [])
    return metadata


def _reset_warnings(state: AgentState) -> None:
    _planner_metadata(state)["planner_warnings"] = []


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


def _validate_plan(state: AgentState, nodes: list[str], edges: list[tuple[str, str]]) -> None:
    node_set = set(nodes)
    agent_nodes = [node for node in nodes if node != "planner"]
    for source, target in edges:
        if source not in node_set or target not in node_set:
            _warn(state, f"Planner skipped invalid edge outside DAG nodes: {source} -> {target}")

    if agent_nodes and not any(source == "planner" for source, _ in edges):
        _warn(state, "Planner DAG has no runnable root edge from planner")

    dependencies: dict[str, set[str]] = {node: set() for node in agent_nodes}
    for source, target in edges:
        if target in dependencies and source in dependencies:
            dependencies[target].add(source)

    remaining = agent_nodes.copy()
    completed: set[str] = set()
    while remaining:
        ready = [node for node in remaining if dependencies[node].issubset(completed)]
        if not ready:
            _warn(state, f"Planner DAG dependency cycle: {', '.join(remaining)}")
            return
        for node in ready:
            completed.add(node)
            remaining.remove(node)


def _plan_hash(state: AgentState, nodes: list[str], edges: list[tuple[str, str]]) -> str:
    app = state.get("application")
    payload = {
        "product": getattr(app, "product", "unknown"),
        "nodes": nodes,
        "edges": edges,
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _plan_id(state: AgentState, plan_hash: str) -> str:
    app = state.get("application")
    product = getattr(app, "product", "unknown")
    replan_count = int(state.get("replan_count", 0))
    return f"{product}:r{replan_count}:{plan_hash[:12]}"


def _record_plan_trace(state: AgentState, dag: DAG) -> None:
    metadata = _planner_metadata(state)
    metadata.setdefault("planner_plan_trace", [])
    metadata["planner_plan_trace"].append(
        {
            "plan_id": dag.plan_id,
            "plan_hash": dag.plan_hash,
            "replan_count": int(state.get("replan_count", 0)),
            "nodes": dag.nodes,
            "edges": dag.edges,
            "warnings": dag.warnings,
        }
    )


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
    _reset_warnings(state)
    config = _planner_metadata(state).get("product_config", {}) or {}
    agents = _configured_agents(state, config)
    edges = _build_edges(state, config, agents)
    nodes = ["planner", *agents]
    _validate_plan(state, nodes, edges)
    digest = _plan_hash(state, nodes, edges)
    dag = DAG(
        nodes=nodes,
        edges=edges,
        rationale=_rationale(state, agents, edges),
        plan_id=_plan_id(state, digest),
        plan_hash=digest,
        warnings=list(_planner_metadata(state)["planner_warnings"]),
    )
    _record_plan_trace(state, dag)
    return dag, []


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
