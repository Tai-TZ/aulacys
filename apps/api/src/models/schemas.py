from typing import Any

from pydantic import BaseModel, Field

from src.agents.state import ComplianceVerdict, NodeTrace, RunTrace


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="User message")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Agent response")


class AssessResponse(BaseModel):
    """Structured run result for the dashboard (see docs/API.md).

    Reuses the agent-state models so the API stays in lockstep with the graph.
    """

    response: str = Field(..., description="Human-readable summary")
    outcome: str = Field(..., description="stp_approved | vetoed | ready_for_human_approval")
    run_trace: RunTrace
    compliance: ComplianceVerdict | None = None
    trace: list[NodeTrace] = Field(default_factory=list)
    ticket: dict[str, Any] | None = None
