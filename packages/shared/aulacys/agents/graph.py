from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import uuid4

import yaml
from langgraph.graph import END, StateGraph

from aulacys.agents.audit_client import post_audit
from aulacys.agents.harness.runner import run
from aulacys.agents.nodes.compliance import ComplianceSpec
from aulacys.agents.nodes.credit import CreditSpec
from aulacys.agents.nodes.critic import CriticSpec
from aulacys.agents.nodes.operations import OperationsSpec, write_outcome_ticket
from aulacys.agents.nodes.planner import PlannerSpec
from aulacys.agents.state import AgentState, Document, LoanApplication, RunTrace
from aulacys.agents.worker_client import run_agent

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


# ---------------------------------------------------------------------------
# Three consumer-loan demo seeds (retail_unsecured_salary focused)
# ---------------------------------------------------------------------------
# HAPPY  → NGUYỄN THỊ BÉ HOA  (CCCD 074300004128) — clean file, STP/HITL pass
# VETO   → TRẦN THỊ VUI       (CCCD 091185013867) — purpose evidence contradicts declaration
# HITL   → NGUYỄN THỊ HUYỀN TRẦN (CCCD 054301008970) — borderline DTI, needs human review

_UNSECURED_HAPPY: dict = {
    "declared": {
        # --- Khoản vay ---
        "customer_name": "NGUYỄN THỊ BÉ HOA",
        "amount": 150_000_000,  # 150 triệu — trong tầm kiểm soát
        "term_months": 36,
        "annual_rate": 0.13,
        "monthly_income": 22_000_000,
        "existing_monthly_debt": 0,  # không có nợ cũ → DTI thấp
        "declared_purpose": "Mua sắm nội thất, tiêu dùng cá nhân",
        # --- CCCD (ảnh thực) ---
        "dob": "10/06/2000",
        "gender": "Nữ",
        "national_id": "074300004128",
        "national_id_issue_date": "21/05/2025",
        "national_id_issue_place": "Bộ Công an",
        "old_national_id": "074300001234",
        # --- Liên lạc ---
        "phone": "0912300004",
        "phone_2": "0987654321",
        "zalo_phone": "0912300004",
        "permanent_address": "Tổ 2, Khu Phố Cổng Xanh, Tân Bình, Bắc Tân Uyên, Bình Dương",
        "current_address": "Tổ 2, Khu Phố Cổng Xanh, Tân Bình, Bắc Tân Uyên, Bình Dương",
        "email": "behoa.nguyen@email.com",
        # --- Việc làm ---
        "occupation": "Nhân viên văn phòng",
        "company_name": "Công ty TNHH SX TM Phúc Thịnh",
        "position": "Nhân viên kinh doanh",
        "company_address": "Khu công nghiệp VSIP II, Bình Dương",
        "salary_payday": "Ngày 5 hàng tháng",
        "personal_expense": 8_000_000,
        # --- Giải ngân ---
        "disbursement_method": "Giải ngân cho Bên vay",
        "disbursement_bank": "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)",
        "disbursement_branch": "Chi nhánh Bình Dương",
        "disbursement_account": "104074300004",
        "disbursement_account_name": "NGUYỄN THỊ BÉ HOA",
        # --- Người tham chiếu ---
        "ref1_name": "Nguyễn Thị Kim Loan",
        "ref1_relationship": "Mẹ",
        "ref1_phone": "0912300001",
        "ref1_same_address": True,
        "ref2_name": "Trần Văn Minh",
        "ref2_relationship": "Đồng nghiệp",
        "ref2_phone": "0912300002",
        "ref2_same_address": False,
        # --- Consent ---
        "consent_data_processing": True,
        "consent_advertising": True,
    },
    "documents": [
        Document(kind="cccd", tier=1, extracted={"verified": True, "id_number": "074300004128"}),
        Document(kind="sao_ke_luong", tier=1, extracted={"monthly_income": 22_000_000}),
        Document(kind="cic", tier=1, extracted={"score_band": "A"}),
    ],
}

_UNSECURED_VETO: dict = {
    "declared": {
        # --- Khoản vay ---
        "customer_name": "TRẦN THỊ VUI",
        "amount": 300_000_000,  # 300 triệu, mục đích KHAI là tiêu dùng
        "term_months": 24,
        "annual_rate": 0.13,
        "monthly_income": 18_000_000,
        "existing_monthly_debt": 8_500_000,  # nợ cũ cao → DTI biên giới
        "declared_purpose": "Tiêu dùng cá nhân",  # khai báo hợp lệ…
        # --- CCCD (ảnh thực) ---
        "dob": "10/05/1985",
        "gender": "Nữ",
        "national_id": "091185013867",
        "national_id_issue_date": "02/06/2023",
        "national_id_issue_place": "Cục Trưởng Cục Cảnh sát Quản lý hành chính về trật tự xã hội",
        "old_national_id": "091185002233",
        # --- Liên lạc ---
        "phone": "0913000091",
        "phone_2": "0922334455",
        "zalo_phone": "0913000091",
        "permanent_address": "Mong Thá, Châu Thành, Kiên Giang",
        "current_address": "Thổ Sơn, Hòn Đất, Kiên Giang",
        "email": "vui.tran@email.com",
        # --- Việc làm ---
        "occupation": "Buôn bán tự do",
        "company_name": "Hộ kinh doanh cá thể",
        "position": "Chủ hộ",
        "company_address": "Chợ Thổ Sơn, Hòn Đất, Kiên Giang",
        "salary_payday": "Không cố định",
        "personal_expense": 10_000_000,
        # --- Giải ngân ---
        "disbursement_method": "Giải ngân cho Bên vay",
        "disbursement_bank": "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)",
        "disbursement_branch": "Chi nhánh Kiên Giang",
        "disbursement_account": "109091185013",
        "disbursement_account_name": "TRẦN THỊ VUI",
        # --- Người tham chiếu ---
        "ref1_name": "Trần Văn Thanh",
        "ref1_relationship": "Anh trai",
        "ref1_phone": "0913000092",
        "ref1_same_address": True,
        "ref2_name": "Lê Thị Hồng",
        "ref2_relationship": "Hàng xóm",
        "ref2_phone": "0913000093",
        "ref2_same_address": False,
        # --- Consent ---
        "consent_data_processing": True,
        "consent_advertising": True,
    },
    # … nhưng purpose_evidence cho thấy thực tế là tất toán khoản vay → VETO
    "documents": [
        Document(kind="cccd", tier=1, extracted={"verified": True, "id_number": "091185013867"}),
        Document(kind="sao_ke_luong", tier=1, extracted={"monthly_income": 18_000_000}),
        Document(kind="cic", tier=1, extracted={"score_band": "B"}),
        Document(
            kind="purpose_evidence",
            tier=2,
            extracted={"actual_purpose": "tất toán khoản vay ở TCTD khác"},
        ),
    ],
}

_UNSECURED_HITL: dict = {
    "declared": {
        # --- Khoản vay ---
        "customer_name": "NGUYỄN THỊ HUYỀN TRẦN",
        "amount": 200_000_000,  # 200 triệu — DTI biên giới ~45%
        "term_months": 48,
        "annual_rate": 0.135,
        "monthly_income": 15_000_000,
        "existing_monthly_debt": 5_000_000,
        "declared_purpose": "Tiêu dùng cá nhân (sửa chữa nhà)",
        # --- CCCD (ảnh thực) ---
        "dob": "19/03/2001",
        "gender": "Nữ",
        "national_id": "054301008970",
        "national_id_issue_date": "05/07/2022",
        "national_id_issue_place": "Cục Trưởng Cục Cảnh sát Quản lý hành chính về trật tự xã hội",
        "old_national_id": "054301001111",
        # --- Liên lạc ---
        "phone": "0905400054",
        "phone_2": "0933445566",
        "zalo_phone": "0905400054",
        "permanent_address": "Hiệp Trung, Thị xã Đồng Hòa, Phú Yên",
        "current_address": "Khu Phổ Phú Hòa, Hòa Hiệp Trung, Thị xã Đồng Hòa, Phú Yên",
        "email": "huyentran.nguyen@email.com",
        # --- Việc làm ---
        "occupation": "Giáo viên",
        "company_name": "Trường THCS Hòa Hiệp Trung",
        "position": "Giáo viên",
        "company_address": "Thị xã Đông Hòa, Phú Yên",
        "salary_payday": "Ngày 15 hàng tháng",
        "personal_expense": 7_000_000,
        # --- Giải ngân ---
        "disbursement_method": "Giải ngân cho Bên vay",
        "disbursement_bank": "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)",
        "disbursement_branch": "Chi nhánh Phú Yên",
        "disbursement_account": "105054301008",
        "disbursement_account_name": "NGUYỄN THỊ HUYỀN TRẦN",
        # --- Người tham chiếu ---
        "ref1_name": "Nguyễn Thị Lan",
        "ref1_relationship": "Mẹ",
        "ref1_phone": "0905400055",
        "ref1_same_address": True,
        "ref2_name": "Trần Văn Phúc",
        "ref2_relationship": "Đồng nghiệp",
        "ref2_phone": "0905400056",
        "ref2_same_address": False,
        # --- Consent ---
        "consent_data_processing": True,
        "consent_advertising": False,
    },
    # Hồ sơ chưa đầy đủ: sao kê chưa verify, CIC hạng B
    "documents": [
        Document(kind="cccd", tier=1, extracted={"verified": True, "id_number": "054301008970"}),
        Document(kind="sao_ke_luong", tier=2, extracted={"monthly_income": 15_000_000}),  # tier-2: chưa verify
        Document(kind="cic", tier=1, extracted={"score_band": "B"}),
    ],
}


def seed_application(query: str) -> LoanApplication:
    """Seed a demo consumer-loan application from chat text.

    Routing keywords:
    - "veto"  / "bad"      → TRẦN THỊ VUI      (purpose evidence veto)
    - "hitl"  / "biên giới" → NGUYỄN THỊ HUYỀN TRẦN (borderline DTI → human)
    - "mortgage" / "nhà"   → retail_mortgage demo
    - default              → NGUYỄN THỊ BÉ HOA (happy STP path)
    """
    lowered = query.lower()
    if "mortgage" in lowered or "nhà" in lowered:
        product = "retail_mortgage"
        seed = {
            "declared": {
                "customer_name": "TRẦN THỊ BÌNH",
                "amount": 2_500_000_000,
                "term_months": 240,
                "annual_rate": 0.105,
                "monthly_income": 85_000_000,
                "existing_monthly_debt": 8_000_000,
                "declared_purpose": "Mua nhà để ở",
                "collateral_value_declared": 4_000_000_000,
                "dob": "15/08/1988",
                "gender": "Nữ",
                "national_id": "001088012345",
                "national_id_issue_date": "10/05/2021",
                "national_id_issue_place": "Cục Cảnh sát Quản lý hành chính về trật tự xã hội",
                "old_national_id": "001088001122",
                "phone": "0901234567",
                "phone_2": "0911223344",
                "email": "binh.tran@email.com",
                "occupation": "Cán bộ quản lý",
                "company_name": "Công ty Cổ phần Thương mại và Dịch vụ SHB",
                "position": "Trưởng phòng Kinh doanh",
                "permanent_address": "Số 45, Đường Lê Duẩn, Quận 1, TP. Hồ Chí Minh",
                "current_address": "Số 45, Đường Lê Duẩn, Quận 1, TP. Hồ Chí Minh",
                "personal_expense": 25_000_000,
                "disbursement_method": "Giải ngân cho Bên thụ hưởng",
                "disbursement_bank": "Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)",
                "disbursement_account": "101123456789",
                "disbursement_account_name": "NGUYỄN VĂN BÁN",
                "spouse_name": "NGUYỄN VĂN AN",
                "spouse_phone": "0902345678",
                "spouse_national_id": "001085054321",
                "spouse_income": 35_000_000,
                "spouse_company": "Công ty Cổ phần Đầu tư SHB",
                "spouse_workplace_phone": "0243123456",
                "consent_data_processing": True,
                "consent_advertising": False,
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
                    kind="purpose_evidence",
                    tier=2,
                    extracted={"actual_purpose": "tất toán khoản vay ở TCTD khác"},
                ),
            ],
        }
    else:
        product = "retail_unsecured_salary"
        if "veto" in lowered or "bad" in lowered:
            seed = _UNSECURED_VETO
        elif "hitl" in lowered or "biên giới" in lowered or "borderline" in lowered:
            seed = _UNSECURED_HITL
        else:
            seed = _UNSECURED_HAPPY
    return LoanApplication(product=product, declared=seed["declared"], documents=seed["documents"])


def _configured_agent_names(config: dict[str, Any]) -> list[str]:
    return [str(agent_name) for agent_name in config.get("agents", []) if str(agent_name) in AGENT_SPECS]


def _agent_execution_order(state: AgentState, config: dict[str, Any]) -> list[str]:
    """Topologically order configured agents from Planner's DAG plus spec read-sets."""
    configured = _configured_agent_names(config)
    dependencies: dict[str, set[str]] = {agent_name: set() for agent_name in configured}
    plan = state.get("plan")

    if plan is not None:
        for prerequisite, node in plan.edges:
            if node in dependencies and prerequisite in dependencies:
                dependencies[node].add(prerequisite)

    for agent_name in configured:
        for read_key in AGENT_SPECS[agent_name].reads:
            if read_key in dependencies:
                dependencies[agent_name].add(read_key)

    remaining = configured.copy()
    ordered: list[str] = []
    completed: set[str] = set()
    while remaining:
        ready = [agent_name for agent_name in remaining if dependencies[agent_name].issubset(completed)]
        if not ready:
            state.setdefault("metadata", {}).setdefault("graph_warnings", []).append(
                f"DAG dependency cycle or missing prerequisite: {', '.join(remaining)}"
            )
            ordered.extend(remaining)
            break
        for agent_name in ready:
            ordered.append(agent_name)
            completed.add(agent_name)
            remaining.remove(agent_name)
    return ordered


def _run_configured_agents(state: AgentState, config: dict[str, Any]) -> None:
    for agent_name in _agent_execution_order(state, config):
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
    return write_outcome_ticket(state, outcome)


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
