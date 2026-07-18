from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState


def _dump(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_dump(item) for item in value]
    if isinstance(value, dict):
        return {key: _dump(item) for key, item in value.items()}
    return value


def assemble(spec: AgentSpec, state: AgentState) -> list[dict[str, Any]]:
    """Build a small, stable message list using only `spec.reads` slices."""
    sliced = {key: _dump(state[key]) for key in spec.reads if key in state}
    return [
        {"role": "system", "content": spec.prompt, "tools": spec.tools},
        {"role": "user", "content": sliced},
    ]
