from __future__ import annotations

from typing import TypedDict


class AgentState(TypedDict, total=False):
    """State schema for the LangGraph agent.

    Each node reads from and writes to this state.
    total=False makes all fields optional.
    """

    query: str
    response: str
    error: str
    metadata: dict
