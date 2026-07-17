from __future__ import annotations

import json
import os
import time
import urllib.request
from typing import Any

from pydantic import BaseModel

from src.agents.harness import context, trace
from src.agents.harness.runner import run
from src.agents.specs import AgentSpec
from src.agents.state import AgentState, NodeTrace
from src.agents.transport import dump_state

WORKER_ENV = {
    "credit": "CREDIT_AGENT_URL",
    "operations": "OPERATIONS_AGENT_URL",
    "compliance": "COMPLIANCE_AGENT_URL",
    "critic": "CRITIC_AGENT_URL",
}


def _request_id(state: AgentState) -> str:
    return str(state.get("metadata", {}).get("request_id", ""))


def _worker_url(spec: AgentSpec) -> str | None:
    env_var = WORKER_ENV.get(spec.name)
    if not env_var:
        return None
    value = os.getenv(env_var, "").strip()
    return value.rstrip("/") if value else None


def _post_worker(spec: AgentSpec, state: AgentState, url: str) -> tuple[BaseModel, list[str], int]:
    started = time.perf_counter()
    payload = {
        "agent": spec.name,
        "request_id": _request_id(state),
        "state": dump_state(state),
    }
    req = urllib.request.Request(
        f"{url}/run",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Request-ID": _request_id(state),
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310
        data: dict[str, Any] = json.loads(resp.read().decode("utf-8"))
    output = spec.output.model_validate(data["output"])
    tool_calls = list(data.get("tool_calls", []))
    latency_ms = int(data.get("latency_ms") or round((time.perf_counter() - started) * 1000))
    return output, tool_calls, latency_ms


def run_agent(spec: AgentSpec, state: AgentState) -> BaseModel:
    """Run an agent locally or through its worker service.

    Env vars opt into Phase 5 network workers. Any network/schema failure falls
    back to the in-process harness so the veto demo stays alive.
    """
    url = _worker_url(spec)
    if not url:
        return run(spec, state)

    messages = context.assemble(spec, state)
    try:
        output, tool_calls, latency_ms = _post_worker(spec, state, url)
        trace.emit(
            state,
            NodeTrace(
                node=spec.name,
                model=f"http-worker:{spec.model}",
                tokens_in=len(str(messages)),
                tokens_out=len(output.model_dump_json()),
                latency_ms=latency_ms,
                tool_calls=tool_calls,
                fallback_fired=False,
            ),
        )
        return output
    except Exception:
        return run(spec, state)
