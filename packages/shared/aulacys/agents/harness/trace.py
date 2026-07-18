from __future__ import annotations

from aulacys.agents.state import AgentState, NodeTrace


def emit(state: AgentState, trace: NodeTrace) -> None:
    state.setdefault("trace", [])
    state["trace"].append(trace)
