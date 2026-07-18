from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
SHARED = REPO_ROOT / "packages" / "shared"
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))
if str(SHARED) not in sys.path:
    sys.path.insert(0, str(SHARED))

from aulacys.agents.graph import load_product_config, seed_application  # noqa: E402
from aulacys.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402


def _state() -> dict:
    application = seed_application("retail mortgage")
    return {
        "query": "retail mortgage",
        "application": application.model_dump(mode="json"),
        "metadata": {
            "application_id": "retail-demo",
            "product_config": load_product_config(application.product),
            "agent_contracts": {
                "credit": {"reads": ["application"]},
                "operations": {"reads": ["application", "metadata"]},
                "compliance": {"reads": ["application", "credit", "operations"]},
            },
            "request_id": "req-test",
        },
        "trace": [],
        "replan_count": 0,
    }


def _disable_llm(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    get_settings.cache_clear()


def test_health_lists_all_agents() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json()["agents"] == [
        "planner",
        "credit",
        "operations",
        "compliance",
        "critic",
    ]


def test_run_dispatches_planner_and_credit_in_one_runtime(monkeypatch) -> None:
    _disable_llm(monkeypatch)
    client = TestClient(app)

    planner = client.post(
        "/run", json={"agent": "planner", "request_id": "req-test", "state": _state()}
    )
    credit = client.post(
        "/run", json={"agent": "credit", "request_id": "req-test", "state": _state()}
    )

    assert planner.status_code == 200
    assert planner.json()["output"]["nodes"][0] == "planner"
    assert planner.json()["tool_calls"] == []
    assert credit.status_code == 200
    assert credit.json()["output"]["recommendation"] in {
        "support",
        "manual_review",
        "decline",
    }
    assert "compute_dti" in credit.json()["tool_calls"]


def test_run_rejects_unknown_agent() -> None:
    response = TestClient(app).post(
        "/run", json={"agent": "ghost", "request_id": "req-test", "state": _state()}
    )

    assert response.status_code == 400
    assert "unknown agent" in response.json()["detail"]
