"""Unit + route smoke tests for audit-svc (Postgres required)."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

# Default local URL matches docker-compose postgres + search_path=audit
_DEFAULT_URL = (
    "postgresql://postgres:postgres@127.0.0.1:5432/postgres?options=-csearch_path%3Daudit"
)


@pytest.fixture(scope="session")
def database_url() -> str:
    url = os.getenv("DATABASE_URL", _DEFAULT_URL)
    if not url.startswith("postgres"):
        pytest.skip("DATABASE_URL must be postgres")
    return url


@pytest.fixture()
def pg(database_url: str, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("DB_SCHEMA", "audit")
    from app.core.config import get_settings
    from app.db.engine import get_engine, reset_engine_cache
    from app.repositories import ledger
    from app.services import audit as audit_service

    get_settings.cache_clear()
    reset_engine_cache()
    try:
        with get_engine().connect() as conn:
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS audit"))
            conn.commit()
    except Exception as exc:
        pytest.skip(f"Postgres unavailable: {exc}")

    audit_service.init()
    ledger._truncate_all()
    yield
    ledger._truncate_all()
    get_settings.cache_clear()
    reset_engine_cache()


@pytest.fixture()
def client(pg) -> TestClient:
    from app.main import app

    return TestClient(app)


def _sample_rec(**overrides):
    base = {
        "application_id": "retail-demo",
        "product": "retail_mortgage",
        "lane": 3,
        "outcome": "vetoed",
        "veto_fired": True,
        "replan_count": 2,
        "as_of": "2026-07-18",
        "signed_by": "system",
    }
    base.update(overrides)
    return base


def _sample_vio():
    return {
        "rule_id": "prohibited_purpose_refinance_other_bank",
        "rule_version": "1.0",
        "effective_from": "2023-09-01",
        "legal_basis": "demo",
        "metric_name": "prohibited_purpose_refinance_other_bank",
        "metric_value": 1.0,
        "threshold": 0.0,
        "is_blocking": True,
    }


def test_append_and_verify_intact(pg) -> None:
    from app.services import audit as audit_service

    for _ in range(3):
        audit_service.record_decision(_sample_rec(), [_sample_vio()])
    assert audit_service.chain_status() == {"intact": True, "records": 3}


def test_tamper_breaks_chain(pg) -> None:
    from app.db.engine import get_engine
    from app.services import audit as audit_service

    for _ in range(3):
        audit_service.record_decision(_sample_rec(), [])
    with Session(get_engine()) as session:
        # Bypass app API — raw SQL. Triggers block UPDATE in prod Alembic;
        # create_all may not install triggers, so this still proves the hash chain.
        session.execute(text("UPDATE audit_record SET outcome='approved' WHERE seq=2"))
        session.commit()
    status = audit_service.chain_status()
    assert status["intact"] is False
    assert status["broken_at_seq"] == 2


def test_records_for_application(pg) -> None:
    from app.services import audit as audit_service

    audit_service.record_decision(_sample_rec(application_id="a1"), [])
    audit_service.record_decision(_sample_rec(application_id="a2"), [])
    rows = audit_service.list_records("a1")
    assert len(rows) == 1


def test_health_and_post_record(client: TestClient) -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["backend"] == "postgres"

    resp = client.post("/records", json={**_sample_rec(), "violations": [_sample_vio()]})
    assert resp.status_code == 200
    assert resp.json()["seq"] == 1
    assert client.get("/verify").json()["intact"] is True
