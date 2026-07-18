from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import uuid4

import yaml
from langgraph.graph import END, StateGraph

from src.agents.audit_client import post_audit
from src.agents.harness.runner import run
from src.agents.nodes.compliance import ComplianceSpec
from src.agents.nodes.credit import CreditSpec
from src.agents.nodes.critic import CriticSpec
from src.agents.nodes.operations import OperationsSpec
from src.agents.nodes.planner import PlannerSpec
from src.agents.state import AgentState, Document, LoanApplication, RunTrace
from src.agents.tools.workflow import write_approval_ticket
from src.agents.worker_client import run_agent

PRODUCTS_DIR = Path(__file__).parent / "products"
REPLAN_CAP = 2

AGENT_SPECS = {
    "credit": CreditSpec,
    "operations": OperationsSpec,
    "compliance": ComplianceSpec,
}


def load_product_config(product: str) -> dict[str, Any]:
    path = PRODUCTS_DIR / f"{product}.yaml"
    if not path.is_file():
        raise ValueError(f"Unknown product config: {product}")
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def _document_value(documents: list[Document], kind: str, key: str, default: Any = None) -> Any:
    for document in documents:
        if document.kind == kind and document.extracted:
            return document.extracted.get(key, default)
    return default


def seed_application(query: str) -> LoanApplication:
    """Seed a demo application from chat text.

    The default seed is the protected mortgage veto flow. A user can type "tín chấp"
    or "unsecured" to exercise the second product without code changes.
    """
    lowered = query.lower()
    product = "retail_unsecured_salary" if "tín chấp" in lowered or "unsecured" in lowered else "retail_mortgage"
    seeds = {
        "retail_unsecured_salary": {
            "declared": {
                "customer_name": "Nguyen Van A",
                "amount": 250_000_000,
                "term_months": 36,
                "annual_rate": 0.13,
                "monthly_income": 35_000_000,
                "existing_monthly_debt": 3_000_000,
                "declared_purpose": "tiêu dùng cá nhân",
                "id_number": "001099000001",  # clean CIC (group 1)
                "cic_consent": True,
            },
            "documents": [
                Document(kind="cccd", tier=1, extracted={"verified": True}),
                Document(kind="sao_ke_luong", tier=1, extracted={"monthly_income": 35_000_000}),
                Document(kind="cic", tier=1, extracted={"score_band": "A"}),
            ],
        },
        "retail_mortgage": {
            "declared": {
                "customer_name": "Tran Thi B",
                "amount": 2_500_000_000,
                "term_months": 240,
                "annual_rate": 0.105,
                "monthly_income": 85_000_000,
                "existing_monthly_debt": 8_000_000,
                "declared_purpose": "mua nhà để ở",
                "collateral_value_declared": 4_000_000_000,
                "id_number": "001099000003",  # overdue 120d — demo CIC bad path
                "cic_consent": True,
            },
            "documents": [
                Document(kind="cccd", tier=1, extracted={"verified": True}),
                Document(kind="sao_ke_tai_khoan", tier=1, extracted={"monthly_income": 85_000_000}),
                Document(kind="so_do", tier=2, extracted={"parcel": "DEMO-001"}),
                Document(kind="hop_dong_mua_ban", tier=2, extracted={"seller": "Demo Seller"}),
                Document(kind="cic", tier=1, extracted={"score_band": "A"}),
                Document(
                    kind="purpose_evidence", tier=2, extracted={"actual_purpose": "tất toán khoản vay ở TCTD khác"}
                ),
            ],
        },
    }
    seed = seeds[product]
    return LoanApplication(product=product, declared=seed["declared"], documents=seed["documents"])


def _run_configured_agents(state: AgentState, config: dict[str, Any]) -> None:
    for agent_name in config.get("agents", []):
        spec = AGENT_SPECS.get(agent_name)
        if spec is None:
            continue
        state[agent_name] = run_agent(spec, state)


def _has_veto(state: AgentState) -> bool:
    compliance = state.get("compliance")
    return bool(compliance and compliance.veto)


def _base_lane(config: dict[str, Any]) -> int:
    """Lane from config, no `if product`. `stp_when: never` (mortgage) => lane 3."""
    gate = config.get("gate", {}) or {}
    return 3 if str(gate.get("stp_when", "")).strip() == "never" else 1


def _stp_eligible(state: AgentState, config: dict[str, Any]) -> bool:
    """STP from product gate config — no product-name branching."""
    gate = config.get("gate", {}) or {}
    stp_when = str(gate.get("stp_when", "")).strip()
    if not stp_when or stp_when == "never":
        return False
    if "all_rules_pass" not in stp_when:
        return False
    if _has_veto(state):
        return False
    ceiling = (config.get("limits") or {}).get("amount_ceiling")
    if ceiling is not None:
        amount = float(state["application"].declared.amount)
        if amount > float(ceiling):
            return False
    return True


def _decide_outcome(state: AgentState, config: dict[str, Any], escalated: bool) -> str:
    if escalated or _has_veto(state):
        return "vetoed"
    if _stp_eligible(state, config):
        return "stp_approved"
    return "ready_for_human_approval"


def _write_ticket(state: AgentState, outcome: str) -> dict[str, Any]:
    compliance = state.get("compliance")
    rule_ids = ", ".join(compliance.rule_ids) if compliance else "none"
    summary = f"{state['application'].product}: {outcome}; rules={rule_ids}"
    return write_approval_ticket.invoke(
        {
            "application_id": state.get("metadata", {}).get("application_id", "retail-demo"),
            "status": outcome,
            "summary": summary,
        }
    )


def _summarize(state: AgentState, outcome: str, escalated: bool) -> str:
    app = state["application"]
    compliance = state.get("compliance")
    critic = state.get("critic")
    ticket = state.get("ticket") or {}
    replans = state.get("replan_count", 0)
    critic_status = critic.passed if critic else "n/a"
    if _has_veto(state):
        tail = "escalated to human after replan cap" if escalated else "resolved"
        return (
            f"{app.product}: Compliance veto on {', '.join(compliance.rule_ids)}. "
            f"Planner replanned {replans} time(s), {tail}; "
            f"Critic passed={critic_status}; ticket={ticket.get('ticket_id')}."
        )
    return (
        f"{app.product}: no blocking veto ({outcome}). Critic passed={critic_status}; ticket={ticket.get('ticket_id')}."
    )


async def process_application(state: AgentState) -> dict[str, Any]:
    next_state: AgentState = dict(state)
    next_state.setdefault("query", "")
    next_state.setdefault("trace", [])
    next_state.setdefault("replan_count", 0)
    next_state.setdefault("run_trace", RunTrace())

    if "application" not in next_state:
        next_state["application"] = seed_application(next_state.get("query", ""))

    config = load_product_config(next_state["application"].product)
    next_state.setdefault("metadata", {})
    next_state["metadata"]["product_config"] = config
    next_state["metadata"].setdefault("application_id", "retail-demo")
    next_state["metadata"].setdefault("request_id", str(uuid4()))

    # Plan -> execute -> (veto -> replan -> RE-EXECUTE)* up to the cap.
    # This loop IS the demo: the veto is an edge back to the planner, and the
    # cap is what stops an infinite veto/replan cycle mid-demo (BUILD-GUIDE §5.2).
    next_state["plan"] = run(PlannerSpec, next_state)
    _run_configured_agents(next_state, config)
    veto_fired = _has_veto(next_state)

    while _has_veto(next_state) and next_state["replan_count"] < REPLAN_CAP:
        next_state["replan_count"] += 1
        next_state["plan"] = run(PlannerSpec, next_state)  # planner reads replan_count
        _run_configured_agents(next_state, config)

    escalated = _has_veto(next_state)  # still vetoed after the cap -> human

    lane = 3 if veto_fired else _base_lane(config)
    if lane == 3:  # Critic (tuyến 3) only runs on lane 3 (BUILD-GUIDE §8)
        next_state["critic"] = run_agent(CriticSpec, next_state)
        if not next_state["critic"].passed:
            escalated = True

    outcome = _decide_outcome(next_state, config, escalated)
    next_state["outcome"] = outcome
    next_state["ticket"] = _write_ticket(next_state, outcome)
    next_state["run_trace"] = RunTrace(
        total_cost=sum(item.cost for item in next_state.get("trace", [])),
        lane=lane,
        replan_count=next_state["replan_count"],
        veto_fired=veto_fired,
    )
    # Best-effort append to audit-svc (no-op unless AUDIT_SVC_URL is set).
    next_state["audit"] = post_audit(next_state)
    next_state["response"] = _summarize(next_state, outcome, escalated)
    return dict(next_state)


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("process_application", process_application)
    graph.set_entry_point("process_application")
    graph.add_edge("process_application", END)
    return graph.compile()


agent = build_graph()
