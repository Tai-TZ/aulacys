"""Audit business logic — no FastAPI imports."""

from __future__ import annotations

from typing import Any

from app.repositories import ledger


def init() -> None:
    ledger.init_db()


def record_decision(payload: dict[str, Any], violations: list[dict[str, Any]]) -> dict[str, Any]:
    return ledger.append_record(payload, violations)


def list_records(application_id: str) -> list[dict[str, Any]]:
    return ledger.records_for(application_id)


def chain_status() -> dict[str, Any]:
    return ledger.verify_chain()
