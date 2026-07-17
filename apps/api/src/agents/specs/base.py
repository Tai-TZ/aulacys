from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class AgentSpec(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str
    line: int | None
    reads: list[str]
    tools: list[str]
    kb: str | None = None
    policy: str | None = None
    output: type[BaseModel]
    model: str
    max_tool_calls: int
    prompt: str
    fallback: Any | None = None
