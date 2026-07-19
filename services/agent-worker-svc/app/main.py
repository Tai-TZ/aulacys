"""Generic specialist-agent runtime.

One container serves every agent node. The orchestrator remains the source of
truth for flow control; this runtime only executes the requested node and returns
its typed output.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

HERE = Path(__file__).resolve()
# Local monorepo: .../services/agent-worker-svc + .../packages/shared
# Docker image: WORKDIR /svc with aulacys copied next to app (PYTHONPATH=/svc).
# Never index parents[N] blindly — Docker paths are shallower and raise IndexError.
_candidates: list[Path] = [HERE.parents[1]]
for _parent in HERE.parents:
    _shared = _parent / "packages" / "shared"
    if _shared.is_dir():
        _candidates.append(_shared)
        break
for candidate in _candidates:
    if candidate.exists() and str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from aulacys.agents.harness.runner import run as run_spec  # noqa: E402
from aulacys.agents.nodes.compliance import ComplianceSpec  # noqa: E402
from aulacys.agents.nodes.credit import CreditSpec  # noqa: E402
from aulacys.agents.nodes.critic import CriticSpec  # noqa: E402
from aulacys.agents.nodes.operations import OperationsSpec  # noqa: E402
from aulacys.agents.nodes.planner import PlannerSpec  # noqa: E402
from aulacys.agents.specs import AgentSpec  # noqa: E402
from aulacys.agents.transport import hydrate_state, to_wire  # noqa: E402

SPECS: dict[str, AgentSpec] = {
    "planner": PlannerSpec,
    "credit": CreditSpec,
    "operations": OperationsSpec,
    "compliance": ComplianceSpec,
    "critic": CriticSpec,
}

app = FastAPI(title="agent-worker-svc", version="0.1.0")


class WorkerRequest(BaseModel):
    agent: str = Field(..., min_length=1)
    request_id: str = ""
    state: dict[str, Any]


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "agents": list(SPECS)}


@app.post("/run")
def run_agent(
    req: WorkerRequest, x_request_id: str | None = Header(default=None)
) -> dict[str, Any]:
    spec = SPECS.get(req.agent)
    if spec is None:
        raise HTTPException(status_code=400, detail=f"unknown agent '{req.agent}'")

    state = hydrate_state(req.state)
    state.setdefault("metadata", {})
    state["metadata"].setdefault("request_id", x_request_id or req.request_id)

    started = time.perf_counter()
    trace_start = len(state.get("trace", []))
    output = run_spec(spec, state)
    node_trace = state.get("trace", [])[trace_start:]
    latency_ms = round((time.perf_counter() - started) * 1000)
    tool_calls = node_trace[-1].tool_calls if node_trace else []
    if node_trace:
        latency_ms = node_trace[-1].latency_ms

    return {
        "agent": spec.name,
        "request_id": state["metadata"].get("request_id", ""),
        "output": to_wire(output),
        "tool_calls": tool_calls,
        "latency_ms": latency_ms,
    }
