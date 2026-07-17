from typing import Any, Literal

from pydantic import BaseModel, Field

from src.agents.state import (
    ComplianceVerdict,
    CreditAssessment,
    DeclaredForm,
    Document,
    NodeTrace,
    OperationsReport,
    RunTrace,
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="User message")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Agent response")


class AssessApplicationRequest(BaseModel):
    """Full loan application body for POST /assess/application.

    Mirrors ``LoanApplication`` in ``state.py`` so the graph can run on submitted
    data instead of ``seed_application()``. Tier-3 docs may carry ``extracted`` +
    ``confirmed_by`` (human confirm, not OCR).
    """

    product: str = Field(..., description="retail_mortgage | retail_unsecured_salary")
    declared: DeclaredForm
    documents: list[Document] = Field(default_factory=list)


class AssessResponse(BaseModel):
    """Structured run result for the dashboard (see docs/API.md).

    Reuses the agent-state models so the API stays in lockstep with the graph.
    """

    response: str = Field(..., description="Human-readable summary")
    outcome: str = Field(..., description="stp_approved | vetoed | ready_for_human_approval")
    run_trace: RunTrace
    credit: CreditAssessment | None = None
    operations: OperationsReport | None = None
    compliance: ComplianceVerdict | None = None
    trace: list[NodeTrace] = Field(default_factory=list)
    ticket: dict[str, Any] | None = None
    audit: dict[str, Any] | None = None


class ApprovalRequest(BaseModel):
    """Human decision after graph outcome (HITL tail of the wow flow)."""

    application_id: str = Field(..., min_length=1, max_length=128)
    decision: Literal["approved", "rejected"]
    signed_by: str = Field(default="approver-demo", min_length=1, max_length=128)
    note: str = Field(default="", max_length=2000)
    prior_outcome: str = Field(default="", max_length=128)
    prior_ticket_id: str | None = Field(default=None, max_length=128)


class ApprovalResponse(BaseModel):
    decision: str
    signed_by: str
    note: str = ""
    prior_outcome: str = ""
    ticket: dict[str, Any]


class ServiceStatusItem(BaseModel):
    name: str
    url: str
    status: str = Field(..., description="up | down")
    latency_ms: int | None = None
    critical: bool = False
    detail: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class ServiceStatusSummary(BaseModel):
    total: int
    up: int
    down: int


class ServiceStatusResponse(BaseModel):
    """Gateway service monitor result."""

    status: str = Field(..., description="ok | degraded")
    checked_at: str
    summary: ServiceStatusSummary
    services: list[ServiceStatusItem]
