"""LOS tests — Postgres required."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

_DEFAULT_URL = (
    "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
    "?options=-csearch_path%3Dlos&connect_timeout=3"
)


def _unavailable(msg: str) -> None:
    if os.getenv("REQUIRE_DB", "").strip().lower() in {"1", "true", "yes"}:
        pytest.fail(msg)
    pytest.skip(msg)


@pytest.fixture(scope="session")
def database_url() -> str:
    url = os.getenv("DATABASE_URL", _DEFAULT_URL)
    if not url.startswith("postgres"):
        _unavailable("DATABASE_URL must be postgres")
    return url


@pytest.fixture()
def pg(database_url: str, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("DB_SCHEMA", "los")
    from app.core.config import get_settings
    from app.db.engine import get_engine, reset_engine_cache
    from app.repositories import tickets
    from app.services import los as los_service

    get_settings.cache_clear()
    reset_engine_cache()
    try:
        with get_engine().connect() as conn:
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS los"))
            conn.commit()
    except Exception as exc:
        _unavailable(f"Postgres unavailable: {exc}")

    los_service.init()
    tickets._truncate_all()
    yield
    tickets._truncate_all()
    get_settings.cache_clear()
    reset_engine_cache()


@pytest.fixture()
def client(pg) -> TestClient:
    from app.main import app

    return TestClient(app)


def test_upsert_keeps_created_at(pg) -> None:
    from app.services import los as los_service

    first = los_service.write_ticket("retail-demo", "vetoed", "first", "retail_mortgage")
    second = los_service.write_ticket(
        "retail-demo", "ready_for_human_approval", "second", "retail_mortgage"
    )
    assert first["ticket_id"] == second["ticket_id"]
    rows = los_service.list_tickets("retail-demo")
    assert rows[0]["status"] == "ready_for_human_approval"
    assert rows[0]["created_at"] <= rows[0]["updated_at"]


def test_history_on_status_change(pg) -> None:
    from app.services import los as los_service

    los_service.write_ticket("app1", "vetoed", "a", "retail_mortgage")
    los_service.write_ticket("app1", "ready_for_human_approval", "b", "retail_mortgage")
    los_service.write_ticket("app1", "ready_for_human_approval", "c", "retail_mortgage")
    hist = los_service.ticket_history("DEMO-APP1")
    assert len(hist) == 2


def test_health_and_post_ticket(client: TestClient) -> None:
    assert client.get("/health").json()["backend"] == "postgres"
    resp = client.post(
        "/tickets",
        json={
            "application_id": "retail-demo",
            "status": "vetoed",
            "summary": "Compliance veto",
            "product": "retail_mortgage",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["source"] == "los-svc"
