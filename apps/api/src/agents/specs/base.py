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
    # LOAN-SOP §0 invariant: an LLM never produces a number or a veto. It may only
    # write prose (nhận định). A spec must OPT IN here for the harness to call the LLM
    # at all; every number/veto-bearing spec leaves this False so its verdict always
    # comes from the deterministic fallback. Closes the P0-2 inversion.
    llm_prose: bool = False
