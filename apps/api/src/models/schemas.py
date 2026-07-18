from typing import Any, Literal, Self

from pydantic import BaseModel, Field, model_validator

from src.agents.state import (
    ComplianceVerdict,
    CreditAssessment,
    CriticVerdict,
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
    """Run assess from a submitted body **or** an application-svc id.

    - ``application_id`` set → load Section A from application-svc (consent gate).
    - else → ``product`` + ``declared`` required (existing dashboard path).
    """

    application_id: str | None = Field(
        default=None,
        min_length=1,
        max_length=64,
        description="UUID from application-svc; when set, declared may be omitted",
    )
    product: str | None = Field(
        default=None,
        description=(
            "Product config id under agents/products/*.yaml — e.g. loan-1, "
            "loan-unsecured-term, retail_mortgage, retail_unsecured_salary"
        ),
    )
    declared: DeclaredForm | None = None
    documents: list[Document] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_id_or_body(self) -> Self:
        if self.application_id:
            return self
        if not self.product or self.declared is None:
            raise ValueError("Provide application_id, or both product and declared")
        return self


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
    critic: CriticVerdict | None = None
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
