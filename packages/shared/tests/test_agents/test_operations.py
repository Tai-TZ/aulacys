from __future__ import annotations

from aulacys.agents.nodes import operations as operations_node
from aulacys.agents.nodes.operations import OperationsSpec, operations_fallback
from aulacys.agents.state import DeclaredForm, Document, LoanApplication


def _state(
    *,
    product: str = "retail_mortgage",
    collateral_value: float | None = 4_000_000_000,
    documents: list[Document] | None = None,
    product_config: dict | None = None,
    required_docs: list[str] | None = None,
) -> dict:
    config = product_config or {
        "limits": {"ltv_cap": 0.9, "term_years_max": 35},
        "documents": {"required": required_docs or ["cccd", "so_do"]},
        "tools": ["property_valuation", "compute_ltv"],
    }
    return {
        "application": LoanApplication(
            product=product,
            declared=DeclaredForm(
                customer_name="Ops Test",
                amount=2_000_000_000,
                term_months=240,
                annual_rate=0.105,
                monthly_income=80_000_000,
                existing_monthly_debt=5_000_000,
                declared_purpose="mua nha",
                collateral_value_declared=collateral_value,
            ),
            documents=documents
            if documents is not None
            else [
                Document(kind="cccd", tier=1, extracted={"verified": True}),
                Document(kind="so_do", tier=1, extracted={"parcel": "P-1", "has_dispute": False}),
            ],
        ),
        "metadata": {"product_config": config, "application_id": "ops-demo"},
    }


def _clean_tools(monkeypatch, *, dispute: bool = False, valuation: float = 4_000_000_000):
    def fake_dispatch(_spec, name, args):
        if name == "doc_checklist":
            missing = [d for d in args.get("required", []) if d not in set(args.get("provided", []))]
            return {"status": "complete" if not missing else "missing", "missing": missing}
        if name == "schedule_valuation":
            return {"task_id": "VAL-OPS-DEMO", "status": "scheduled", "parcel_id": args.get("parcel_id")}
        if name == "property_valuation":
            return {"valuation": valuation, "inputs": args}
        if name == "land_registry":
            flags = ["dispute"] if args.get("has_dispute") or dispute else []
            return {"clear": not flags, "legal_flags": flags, "inputs": args}
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(operations_node, "dispatch", fake_dispatch)


def test_operations_secured_path_passes(monkeypatch) -> None:
    _clean_tools(monkeypatch)
    result, tool_calls = operations_fallback(_state(), OperationsSpec)

    assert result.valuation == 4_000_000_000
    assert result.doc_status == "complete"
    assert result.legal_flags == []
    assert tool_calls == ["doc_checklist", "schedule_valuation", "property_valuation", "land_registry"]
    assert result.tool_results["operational_readiness"]["findings"] == []
    assert "tool_results" in result.rationale
    assert "4000000000" not in result.rationale.replace(",", "")


def test_operations_reads_dispute_flag_from_so_do(monkeypatch) -> None:
    captured: dict = {}

    def fake_dispatch(_spec, name, args):
        if name == "doc_checklist":
            return {"status": "complete", "missing": []}
        if name == "schedule_valuation":
            return {"task_id": "VAL-1", "status": "scheduled"}
        if name == "property_valuation":
            return {"valuation": 1_000_000_000}
        if name == "land_registry":
            captured.update(args)
            return {"clear": False, "legal_flags": ["dispute"], "inputs": args}
        raise AssertionError(name)

    monkeypatch.setattr(operations_node, "dispatch", fake_dispatch)

    result, _ = operations_fallback(
        _state(
            documents=[
                Document(kind="cccd", tier=1, extracted={"verified": True}),
                Document(
                    kind="so_do",
                    tier=1,
                    extracted={"parcel": "P-9", "has_dispute": True, "zoning_flag": False},
                ),
            ]
        ),
        OperationsSpec,
    )

    assert captured["has_dispute"] is True
    assert captured["parcel_id"] == "P-9"
    assert "dispute" in result.legal_flags
    assert "land_registry_clear" in result.tool_results["operational_readiness"]["findings"][0] or any(
        "land_registry" in f for f in result.tool_results["operational_readiness"]["findings"]
    )


def test_operations_unsecured_skips_valuation(monkeypatch) -> None:
    def fake_dispatch(_spec, name, args):
        if name == "doc_checklist":
            return {"status": "complete", "missing": []}
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(operations_node, "dispatch", fake_dispatch)

    result, tool_calls = operations_fallback(
        _state(
            product="retail_unsecured_salary",
            collateral_value=None,
            documents=[Document(kind="cccd", tier=1, extracted={"verified": True})],
            product_config={
                "limits": {"amount_ceiling": 500_000_000, "term_months_max": 60},
                "documents": {"required": ["cccd"]},
                "tools": ["cic_lookup"],
            },
        ),
        OperationsSpec,
    )

    assert tool_calls == ["doc_checklist"]
    assert result.valuation is None
    assert result.tool_results["operational_readiness"]["requires_collateral"] is False


def test_operations_fail_closed_when_secured_missing_collateral_value(monkeypatch) -> None:
    def fake_dispatch(_spec, name, args):
        if name == "doc_checklist":
            return {"status": "complete", "missing": []}
        raise AssertionError(f"unexpected tool call: {name}")

    monkeypatch.setattr(operations_node, "dispatch", fake_dispatch)

    result, tool_calls = operations_fallback(
        _state(collateral_value=None, documents=[Document(kind="cccd", tier=1, extracted={})]),
        OperationsSpec,
    )

    assert tool_calls == ["doc_checklist"]
    assert result.valuation is None
    findings = result.tool_results["operational_readiness"]["findings"]
    assert any("valuation" in item for item in findings)


def test_operations_spec_prose_is_rationale_only() -> None:
    assert OperationsSpec.llm_prose is True
    assert OperationsSpec.prose_fields == ["rationale"]
    assert OperationsSpec.tools == ["core_banking_read", "workflow_write"]
