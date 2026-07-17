from __future__ import annotations

from typing import Any, Literal, TypedDict

from pydantic import BaseModel, Field

from src.policy.loader import PolicyViolation


class Citation(BaseModel):
    source: str
    reference: str
    excerpt: str = ""


class Document(BaseModel):
    kind: str
    tier: Literal[1, 2, 3]
    extracted: dict[str, Any] | None = None
    confirmed_by: str | None = None


class DeclaredForm(BaseModel):
    customer_name: str
    amount: float
    term_months: int
    annual_rate: float = 0.11
    monthly_income: float
    existing_monthly_debt: float = 0
    declared_purpose: str
    collateral_value_declared: float | None = None
    existing_exposure: float = 0
    bank_own_capital: float = 200_000_000_000


class LoanApplication(BaseModel):
    product: str
    declared: DeclaredForm
    documents: list[Document]


class DAG(BaseModel):
    nodes: list[str]
    edges: list[tuple[str, str]]


class CreditAssessment(BaseModel):
    dti: float | None
    income: float
    recommendation: str
    evidence: list[Citation]
    tool_results: dict[str, Any] = Field(default_factory=dict)


class OperationsReport(BaseModel):
    valuation: float | None
    doc_status: str
    missing: list[str]
    legal_flags: list[str]
    evidence: list[Citation]
    tool_results: dict[str, Any] = Field(default_factory=dict)


class ComplianceVerdict(BaseModel):
    violations: list[PolicyViolation]
    veto: bool
    rule_ids: list[str]
    citations: list[Citation]
    tool_results: dict[str, Any] = Field(default_factory=dict)


class CriticVerdict(BaseModel):
    passed: bool
    rejections: list[str]


class NodeTrace(BaseModel):
    node: str
    model: str
    tokens_in: int = 0
    tokens_out: int = 0
    cost: float = 0
    latency_ms: int = 0
    cache_hit: bool = False
    tool_calls: list[str] = Field(default_factory=list)
    schema_retries: int = 0
    fallback_fired: bool = False


class RunTrace(BaseModel):
    total_cost: float = 0
    lane: int = 1
    replan_count: int = 0
    veto_fired: bool = False


class AgentState(TypedDict, total=False):
    """Shared LangGraph state.

    `query` and `response` stay for the existing chat endpoint. The structured fields
    are the build-guide contract used by the demo graph.
    """

    query: str
    response: str
    error: str
    metadata: dict[str, Any]
    application: LoanApplication
    plan: DAG | None
    credit: CreditAssessment | None
    operations: OperationsReport | None
    compliance: ComplianceVerdict | None
    critic: CriticVerdict | None
    replan_count: int
    trace: list[NodeTrace]
    run_trace: RunTrace
    outcome: str
    ticket: dict[str, Any] | None
    audit: dict[str, Any] | None
