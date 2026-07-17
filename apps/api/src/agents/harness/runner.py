from __future__ import annotations

from pydantic import BaseModel

from src.agents.harness import context, trace
from src.agents.harness.meter import NodeTimer
from src.agents.specs import AgentSpec
from src.agents.state import AgentState, NodeTrace


def run(spec: AgentSpec, state: AgentState) -> BaseModel:
    """Run one agent through the shared harness.

    Today the `fallback` is the deterministic node implementation. The LLM call slot
    is intentionally behind this harness so retries, whitelist, trace, and fallback
    stay shared when a real model is plugged in.
    """
    timer = NodeTimer()
    messages = context.assemble(spec, state)
    fallback_fired = True
    tool_calls: list[str] = []

    if spec.fallback is None:
        obj = spec.output.model_validate({})
    else:
        obj, tool_calls = spec.fallback(state, spec)

    trace.emit(
        state,
        NodeTrace(
            node=spec.name,
            model=spec.model,
            tokens_in=len(str(messages)),
            tokens_out=len(obj.model_dump_json()),
            latency_ms=timer.elapsed_ms(),
            tool_calls=tool_calls,
            fallback_fired=fallback_fired,
        ),
    )
    return obj
