from __future__ import annotations

import json
import logging
from typing import Any

from pydantic import BaseModel, ValidationError

from src.agents.harness import context, trace
from src.agents.harness.meter import NodeTimer
from src.agents.specs import AgentSpec
from src.agents.state import AgentState, NodeTrace
from src.config import get_settings

logger = logging.getLogger(__name__)

_MAX_SCHEMA_RETRIES = 2


def _llm_configured() -> bool:
    return bool(get_settings().openai_api_key.strip())


def _try_llm(spec: AgentSpec, messages: list[dict[str, Any]]) -> tuple[BaseModel, int]:
    """Assemble → call structured LLM → parse, with schema retries.

    Tool whitelist stays in ``dispatch`` (used by fallbacks). The LLM must not invent
    numbers; Critic still requires tool-backed figures from the deterministic path
    when the model fails or is absent.
    """
    from src.services.llm import get_llm

    llm = get_llm().with_structured_output(spec.output)
    schema_retries = 0
    last_error: Exception | None = None
    payload = {
        "messages": messages,
        "instruction": (
            f"Return a valid {spec.output.__name__}. "
            "Do not invent numeric metrics; use values already present in state."
        ),
    }

    for attempt in range(_MAX_SCHEMA_RETRIES + 1):
        try:
            result = llm.invoke(json.dumps(payload, default=str))
            if isinstance(result, BaseModel):
                return result, schema_retries
            return spec.output.model_validate(result), schema_retries
        except (ValidationError, Exception) as exc:
            last_error = exc
            schema_retries += 1
            logger.warning("LLM schema attempt %s failed for %s: %s", attempt + 1, spec.name, exc)

    raise RuntimeError(f"LLM failed for {spec.name}: {last_error}")


def run(spec: AgentSpec, state: AgentState) -> BaseModel:
    """Run one agent through the shared harness.

    With ``OPENAI_API_KEY`` set: try the LLM (assemble → call → parse → retry).
    On missing key, timeout, or parse error: use ``spec.fallback`` (demo-proof).
    Tool calls are capped at ``spec.max_tool_calls`` in the fallback path via dispatch.
    """
    timer = NodeTimer()
    messages = context.assemble(spec, state)
    fallback_fired = False
    tool_calls: list[str] = []
    schema_retries = 0
    model_label = spec.model
    obj: BaseModel | None = None

    if _llm_configured():
        try:
            obj, schema_retries = _try_llm(spec, messages)
            model_label = get_settings().model_name
        except Exception as exc:
            logger.warning("LLM path failed for %s, using fallback: %s", spec.name, exc)
            fallback_fired = True
            obj = None
    else:
        fallback_fired = True

    if obj is None:
        fallback_fired = True
        if spec.fallback is None:
            obj = spec.output.model_validate({})
        else:
            obj, tool_calls = spec.fallback(state, spec)

    tool_calls = [name for name in tool_calls if name in spec.tools][: spec.max_tool_calls]

    trace.emit(
        state,
        NodeTrace(
            node=spec.name,
            model=model_label,
            tokens_in=len(str(messages)),
            tokens_out=len(obj.model_dump_json()),
            latency_ms=timer.elapsed_ms(),
            tool_calls=tool_calls,
            schema_retries=schema_retries,
            fallback_fired=fallback_fired,
        ),
    )
    return obj
