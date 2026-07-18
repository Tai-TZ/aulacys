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
    # CCCD (12 digits) for cic-svc lookup — default = seed overdue 120d (group 3+)
    id_number: str = "001099000003"
    cic_consent: bool = True

    # New fields matching the SHBFinance form
    dob: str | None = None
    gender: str | None = None
    national_id: str | None = None
    national_id_issue_date: str | None = None
    national_id_issue_place: str | None = None
    old_national_id: str | None = None
    phone: str | None = None
    phone_2: str | None = None
    zalo_phone: str | None = None
    permanent_address: str | None = None
    current_address: str | None = None
    email: str | None = None
    occupation: str | None = None
    company_name: str | None = None
    position: str | None = None
    company_address: str | None = None
    salary_payday: str | None = None
    personal_expense: float | None = None
    disbursement_method: str | None = None
    disbursement_bank: str | None = None
    disbursement_branch: str | None = None
    disbursement_account: str | None = None
    disbursement_account_name: str | None = None

    # Spouse fields
    spouse_name: str | None = None
    spouse_phone: str | None = None
    spouse_national_id: str | None = None
    spouse_income: float | None = None
    spouse_company: str | None = None
    spouse_workplace_phone: str | None = None

    # Consent fields
    consent_data_processing: bool | None = None
    consent_advertising: bool | None = None

    # Reference fields
    ref1_name: str | None = None
    ref1_relationship: str | None = None
    ref1_phone: str | None = None
    ref1_same_address: bool | None = None

    ref2_name: str | None = None
    ref2_relationship: str | None = None
    ref2_phone: str | None = None
    ref2_same_address: bool | None = None


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
