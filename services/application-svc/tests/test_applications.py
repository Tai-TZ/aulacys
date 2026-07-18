"""application-svc tests — Postgres required."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

_DEFAULT_URL = (
    "postgresql://postgres:postgres@127.0.0.1:5432/postgres"
    "?options=-csearch_path%3Dapplication&connect_timeout=3"
)

_MIN_BODY = {
    "product": "retail_unsecured_salary",
    "total_amount": 50000000,
    "term_months": 36,
    "applicant": {
        "full_name": "Nguyen Van A",
        "id_number": "001099012345",
        "gender": "nam",
    },
    "phone": {"mobile_1": "0901234567"},
    "financial": {"total_income": 20000000, "personal_expense": 5000000},
    "consent": {"data_processing_consent": True, "marketing_consent": False},
    "purposes": [
        {
            "category": "consumer",
            "amount": 50000000,
            "purpose_detail": "mua_sam",
            "goods": [{"seq": 1, "name": "Laptop", "value": 50000000}],
        }
    ],
}


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
    monkeypatch.setenv("DB_SCHEMA", "application")
    from app.core.config import get_settings
    from app.db.engine import get_engine, reset_engine_cache
    from app.repositories import applications as repo
    from app.services import application as app_service

    get_settings.cache_clear()
    reset_engine_cache()
    try:
        with get_engine().connect() as conn:
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS application"))
            conn.commit()
    except Exception as exc:
        _unavailable(f"Postgres unavailable: {exc}")

    app_service.init()
    repo._truncate_all()
    yield
    repo._truncate_all()
    get_settings.cache_clear()
    reset_engine_cache()


@pytest.fixture()
def client(pg) -> TestClient:
    from app.main import app

    return TestClient(app)


def test_consent_gate_rejects(client: TestClient) -> None:
    body = {**_MIN_BODY, "consent": {"data_processing_consent": False}}
    resp = client.post("/applications", json=body)
    assert resp.status_code == 400
    assert "consent" in resp.json()["detail"].lower()


def test_create_and_get(client: TestClient) -> None:
    assert client.get("/health").json()["backend"] == "postgres"
    resp = client.post("/applications", json=_MIN_BODY)
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "application-svc"
    assert data["product"] == "retail_unsecured_salary"

    got = client.get(f"/applications/{data['id']}")
    assert got.status_code == 200
    detail = got.json()
    assert detail["applicant"]["full_name"] == "Nguyen Van A"
    assert detail["consent"]["data_processing_consent"] is True
    assert detail["purposes"][0]["goods"][0]["name"] == "Laptop"


def test_missing_returns_404(client: TestClient) -> None:
    resp = client.get("/applications/00000000-0000-0000-0000-000000000001")
    assert resp.status_code == 404
