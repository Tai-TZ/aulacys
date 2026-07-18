from __future__ import annotations

import json
import logging
from typing import Any

from pydantic import BaseModel, ValidationError

from aulacys.agents.harness import context, trace
from aulacys.agents.harness.meter import NodeTimer
from aulacys.agents.harness.permissions import is_tool_allowed
from aulacys.agents.specs import AgentSpec
from aulacys.agents.state import AgentState, NodeTrace
from aulacys.config import get_settings

logger = logging.getLogger(__name__)

_MAX_SCHEMA_RETRIES = 2


def _llm_configured(spec: AgentSpec) -> bool:
    """LLM runs only for prose specs with a key set for the active provider.

    A number/veto-bearing spec (`llm_prose=False`) NEVER touches the model — its verdict
    always comes from the deterministic fallback. This is the structural guard for
    LOAN-SOP §0 / P0-2: the LLM cannot invent a figure or a veto even when a key exists.
    """
    return bool(spec.llm_prose) and bool(get_settings().llm_api_key)


def _try_llm(spec: AgentSpec, messages: list[dict[str, Any]]) -> tuple[BaseModel, int]:
    """Assemble → call structured LLM → parse, with schema retries.

    Tool whitelist stays in ``dispatch`` (used by fallbacks). The LLM must not invent
    numbers; Critic still requires tool-backed figures from the deterministic path
    when the model fails or is absent.
    """
    from aulacys.services.llm import get_llm

    llm = get_llm(spec.model_tier).with_structured_output(spec.output)
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

    With an API key for the active ``LLM_PROVIDER``: try the LLM (assemble → call → parse → retry).
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

    if _llm_configured(spec) and spec.prose_fields:
        fallback_fired = True
        if spec.fallback is None:
            obj = spec.output.model_validate({})
        else:
            obj, tool_calls = spec.fallback(state, spec)
        try:
            llm_obj, schema_retries = _try_llm(
                spec,
                [
                    *messages,
                    {
                        "role": "system",
                        "content": (
                            "The deterministic base output is authoritative. "
                            f"Only improve these prose fields: {', '.join(spec.prose_fields)}."
                        ),
                    },
                    {"role": "user", "content": obj.model_dump_json()},
                ],
            )
            for field in spec.prose_fields:
                value = getattr(llm_obj, field, None)
                if value:
                    setattr(obj, field, value)
            model_label = _model_name_for_spec(spec)
            fallback_fired = False
        except Exception as exc:
            logger.warning("LLM prose path failed for %s, using deterministic prose: %s", spec.name, exc)
    elif _llm_configured(spec):
        try:
            obj, schema_retries = _try_llm(spec, messages)
            model_label = _model_name_for_spec(spec)
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

    tool_calls = [name for name in tool_calls if is_tool_allowed(spec.tools, name)][: spec.max_tool_calls]

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


def _model_name_for_spec(spec: AgentSpec) -> str:
    from aulacys.services.llm import model_name_for_tier

    return model_name_for_tier(spec.model_tier)
