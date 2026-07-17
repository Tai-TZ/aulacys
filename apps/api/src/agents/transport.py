from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from src.agents.state import (
    DAG,
    AgentState,
    ComplianceVerdict,
    CreditAssessment,
    CriticVerdict,
    LoanApplication,
    NodeTrace,
    OperationsReport,
    RunTrace,
)


def to_wire(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [to_wire(item) for item in value]
    if isinstance(value, tuple):
        return [to_wire(item) for item in value]
    if isinstance(value, dict):
        return {key: to_wire(item) for key, item in value.items()}
    return value


def dump_state(state: AgentState) -> dict[str, Any]:
    return to_wire(dict(state))


def hydrate_state(raw: dict[str, Any]) -> AgentState:
    state: AgentState = dict(raw)
    if raw.get("application"):
        state["application"] = LoanApplication.model_validate(raw["application"])
    if raw.get("plan"):
        state["plan"] = DAG.model_validate(raw["plan"])
    if raw.get("credit"):
        state["credit"] = CreditAssessment.model_validate(raw["credit"])
    if raw.get("operations"):
        state["operations"] = OperationsReport.model_validate(raw["operations"])
    if raw.get("compliance"):
        state["compliance"] = ComplianceVerdict.model_validate(raw["compliance"])
    if raw.get("critic"):
        state["critic"] = CriticVerdict.model_validate(raw["critic"])
    if raw.get("run_trace"):
        state["run_trace"] = RunTrace.model_validate(raw["run_trace"])
    if raw.get("trace"):
        state["trace"] = [NodeTrace.model_validate(item) for item in raw["trace"]]
    return state
