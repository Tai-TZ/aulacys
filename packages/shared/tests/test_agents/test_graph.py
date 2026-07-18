import pytest

from aulacys.agents import graph as graph_module
from aulacys.agents.graph import agent
from aulacys.agents.nodes.compliance import ComplianceSpec
from aulacys.agents.nodes.credit import CreditSpec
from aulacys.agents.nodes.critic import CriticSpec
from aulacys.agents.nodes.operations import OperationsSpec
from aulacys.agents.nodes.planner import PlannerSpec


@pytest.mark.asyncio
async def test_agent_basic_flow():
    result = await agent.ainvoke({"query": "Hello"})
    assert "response" in result


@pytest.mark.asyncio
async def test_agent_state_structure():
    result = await agent.ainvoke({"query": "Test query"})
    assert isinstance(result, dict)
    assert "query" in result


@pytest.mark.asyncio
async def test_unverified_mortgage_rule_escalates_without_auto_veto():
    result = await agent.ainvoke({"query": "retail mortgage"})

    assert result["application"].product == "retail_mortgage"
    # Purpose is verified/blocking in demo; mortgage still has unverified land/LTV rows.
    assert "land_title_clear" in result["compliance"].rule_ids or result["compliance"].veto is True
    land = next(
        (v for v in result["compliance"].violations if v.rule_id == "land_title_clear"),
        None,
    )
    if land is not None:
        assert land.unverified is True
        assert land.severity == "warning"
    # Purpose evidence triggers hard veto (wow-flow edge) when present.
    if "prohibited_purpose_refinance_other_bank" in result["compliance"].rule_ids:
        assert result["compliance"].veto is True
        assert result["run_trace"].veto_fired is True
    assert result["run_trace"].lane == 3
    assert result["critic"].passed is True  # lane 3 -> Critic runs
    assert result["ticket"]["status"] in {"vetoed", "ready_for_human_approval"}
    assert result["credit"].proposed_limit == 2_500_000_000
    assert result["credit"].proposed_rate is not None
    assert "price_loan" in result["credit"].tool_results
    assert result["operations"].valuation_task["status"] == "scheduled"
    assert result["compliance"].kyc_status == "passed"
    assert result["compliance"].ubo_status in {"passed", "not_applicable"}
    assert "kyc_check" in result["compliance"].tool_results
    assert sum(1 for item in result["trace"] if item.node == "compliance") >= 1


@pytest.mark.asyncio
async def test_unsecured_salary_uses_same_graph_without_veto():
    result = await agent.ainvoke({"query": "tín chấp lương"})

    assert result["application"].product == "retail_unsecured_salary"
    assert result["compliance"].veto is False
    assert result["replan_count"] == 0
    report = result["compliance"].tool_results["metric_report"]
    assert report["complete"] is True
    assert report["missing"] == []
    assert report["facts"]["dti"]["source"] == "compute_dti"
    assert result["run_trace"].lane == 1
    assert result.get("critic") is None  # lane 1 -> Critic does not run
    assert result["ticket"]["status"] == "stp_approved"
    assert result["credit"].proposed_limit == 150_000_000
    assert "price_loan" in result["credit"].tool_results


@pytest.mark.asyncio
async def test_common_kyc_controls_apply_to_unsecured_profile(monkeypatch):
    original_seed = graph_module.seed_application

    def seed_without_verified_identity(query: str):
        app = original_seed(query)
        app.documents = [doc for doc in app.documents if doc.kind != "cccd"]
        return app

    monkeypatch.setattr(graph_module, "seed_application", seed_without_verified_identity)

    result = await agent.ainvoke({"query": "tin chap luong"})

    assert result["compliance"].veto is True
    assert "kyc_identity_verified" in result["compliance"].rule_ids


@pytest.mark.asyncio
async def test_aml_facts_are_product_agnostic_and_can_veto(monkeypatch):
    original_seed = graph_module.seed_application

    def seed_with_aml_hit(query: str):
        app = original_seed(query)
        app.documents.append(
            graph_module.Document(
                kind="aml_screening",
                tier=1,
                extracted={"sanctions_match_count": 1, "pep_match_count": 0},
            )
        )
        return app

    monkeypatch.setattr(graph_module, "seed_application", seed_with_aml_hit)

    result = await agent.ainvoke({"query": "tin chap luong"})

    assert result["compliance"].veto is True
    assert "sanctions_hit" in result["compliance"].rule_ids
    assert result["compliance"].tool_results["aml_screen"]["inputs"]["customer_name"]


@pytest.mark.asyncio
async def test_invalid_aml_facts_are_not_trusted(monkeypatch):
    original_seed = graph_module.seed_application

    def seed_with_invalid_aml_facts(query: str):
        app = original_seed(query)
        app.documents.append(
            graph_module.Document(
                kind="aml_screening",
                tier=1,
                extracted={"sanctions_match_count": -1, "pep_match_count": -1},
            )
        )
        return app

    monkeypatch.setattr(graph_module, "seed_application", seed_with_invalid_aml_facts)

    result = await agent.ainvoke({"query": "tin chap luong"})

    aml_inputs = result["compliance"].tool_results["aml_screen"]["inputs"]
    assert aml_inputs["sanctions_match_count"] == 0
    assert aml_inputs["pep_match_count"] == 0
    assert result["ticket"]["status"] == "ready_for_human_approval"
    assert "aml_screening_complete" in result["compliance"].rule_ids


@pytest.mark.asyncio
async def test_pep_warning_never_auto_approves(monkeypatch):
    original_seed = graph_module.seed_application

    def seed_with_pep(query: str):
        app = original_seed(query)
        app.documents.append(
            graph_module.Document(
                kind="aml_screening",
                tier=1,
                extracted={"sanctions_match_count": 0, "pep_match_count": 1},
                source="demo-aml",
                evidence_id="AML-PEP-001",
                dataset_version="2026.1",
            )
        )
        return app

    monkeypatch.setattr(graph_module, "seed_application", seed_with_pep)
    result = await agent.ainvoke({"query": "tin chap luong"})

    assert result["compliance"].veto is False
    assert "pep_requires_enhanced_dd" in result["compliance"].rule_ids
    assert result["ticket"]["status"] == "ready_for_human_approval"
    evidence = {item.rule_id: item for item in result["compliance"].rule_evidence}
    assert evidence["pep_requires_enhanced_dd"].status == "warning"
    assert evidence["max_retail_dti"].status == "passed"


@pytest.mark.asyncio
async def test_unavailable_aml_service_routes_to_hitl(monkeypatch):
    monkeypatch.setenv("AML_SVC_URL", "http://127.0.0.1:1")
    result = await agent.ainvoke({"query": "tin chap luong"})

    assert result["compliance"].veto is False
    assert result["compliance"].tool_results["aml_screen"]["status"] == "unavailable"
    assert "aml_screening_complete" in result["compliance"].rule_ids
    assert result["ticket"]["status"] == "ready_for_human_approval"


@pytest.mark.asyncio
async def test_agent_execution_uses_dag_dependencies(monkeypatch):
    original_load_product_config = graph_module.load_product_config
    config = original_load_product_config("retail_mortgage").copy()
    config["agents"] = ["compliance", "operations", "credit"]

    def fake_load_product_config(product: str):
        if product == "retail_mortgage":
            return config
        return original_load_product_config(product)

    monkeypatch.setattr(graph_module, "load_product_config", fake_load_product_config)

    result = await agent.ainvoke({"query": "retail mortgage"})

    first_cycle = [item.node for item in result["trace"] if item.node in {"credit", "operations", "compliance"}][:3]
    assert first_cycle.index("credit") < first_cycle.index("compliance")
    assert first_cycle.index("operations") < first_cycle.index("compliance")
    assert "dti" in result["compliance"].tool_results["metrics"]


@pytest.mark.asyncio
async def test_agent_execution_warns_on_dag_cycle(monkeypatch):
    original_load_product_config = graph_module.load_product_config
    config = original_load_product_config("retail_unsecured_salary").copy()
    config["depends"] = {"credit": ["compliance"], "compliance": ["credit"]}

    def fake_load_product_config(product: str):
        if product == "retail_unsecured_salary":
            return config
        return original_load_product_config(product)

    monkeypatch.setattr(graph_module, "load_product_config", fake_load_product_config)

    result = await agent.ainvoke({"query": "tín chấp lương"})

    assert "DAG dependency cycle" in result["metadata"]["graph_warnings"][0]


def test_agent_specs_match_role_permission_contract():
    assert PlannerSpec.tools == []
    assert CreditSpec.tools == ["core_banking_read", "loan_calculator"]
    assert ComplianceSpec.tools == ["core_banking_read", "aml_screening"]
    assert OperationsSpec.tools == ["core_banking_read", "workflow_write"]
    assert CriticSpec.tools == []
