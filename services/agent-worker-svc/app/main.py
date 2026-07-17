"""Generic specialist-agent worker.

One image runs as credit-svc, operations-svc, compliance-svc, or critic-svc by
setting AGENT_NAME. The orchestrator remains the source of truth for flow control;
workers only execute one node and return its typed output.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

HERE = Path(__file__).resolve()
for candidate in (HERE.parents[1], HERE.parents[3] / "apps" / "api"):
    if candidate.exists() and str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from src.agents.nodes.compliance import ComplianceSpec  # noqa: E402
from src.agents.nodes.credit import CreditSpec  # noqa: E402
from src.agents.nodes.critic import CriticSpec  # noqa: E402
from src.agents.nodes.operations import OperationsSpec  # noqa: E402
from src.agents.specs import AgentSpec  # noqa: E402
from src.agents.transport import hydrate_state, to_wire  # noqa: E402

SPECS: dict[str, AgentSpec] = {
    "credit": CreditSpec,
    "operations": OperationsSpec,
    "compliance": ComplianceSpec,
    "critic": CriticSpec,
}

AGENT_NAME = os.getenv("AGENT_NAME", "credit").strip()
if AGENT_NAME not in SPECS:
    AGENT_NAME = "credit"

app = FastAPI(title=f"{AGENT_NAME}-svc", version="0.1.0")


class WorkerRequest(BaseModel):
    agent: str = Field(..., min_length=1)
    request_id: str = ""
    state: dict[str, Any]


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "agent": AGENT_NAME}


@app.post("/run")
def run_agent(req: WorkerRequest, x_request_id: str | None = Header(default=None)) -> dict[str, Any]:
    if req.agent != AGENT_NAME:
        raise HTTPException(status_code=400, detail=f"{AGENT_NAME}-svc cannot run {req.agent}")

    spec = SPECS[AGENT_NAME]
    if spec.fallback is None:
        raise HTTPException(status_code=500, detail=f"{AGENT_NAME} has no executable fallback")

    state = hydrate_state(req.state)
    state.setdefault("metadata", {})
    state["metadata"].setdefault("request_id", x_request_id or req.request_id)

    started = time.perf_counter()
    output, tool_calls = spec.fallback(state, spec)
    latency_ms = round((time.perf_counter() - started) * 1000)

    return {
        "agent": AGENT_NAME,
        "request_id": state["metadata"].get("request_id", ""),
        "output": to_wire(output),
        "tool_calls": tool_calls,
        "latency_ms": latency_ms,
    }
