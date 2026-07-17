import importlib.util
import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient


class FakeResponse:
    def __init__(self, payload: dict):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


def load_gateway():
    path = Path(__file__).resolve().parents[4] / "services" / "api-gateway" / "app" / "main.py"
    spec = importlib.util.spec_from_file_location("api_gateway_main", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_gateway_status_aggregates_service_health(monkeypatch):
    module = load_gateway()

    def fake_urlopen(req, timeout):
        assert req.full_url.endswith("/health")
        assert timeout == 2
        return FakeResponse({"status": "ok"})

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    response = TestClient(module.app).get("/status")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["summary"] == {"total": 13, "up": 13, "down": 0}
    assert data["services"][0]["name"] == "api-gateway"
    assert any(item["name"] == "monolith" for item in data["services"])
    assert any(item["name"] == "credit-svc" for item in data["services"])


def test_gateway_assess_returns_fallback_when_monolith_is_down(monkeypatch):
    module = load_gateway()

    def fake_urlopen(req, timeout):
        raise OSError("monolith down")

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    response = TestClient(module.app).post("/assess", json={"message": "retail mortgage"})

    assert response.status_code == 200
    data = response.json()
    assert data["outcome"] == "gateway_unavailable"
    assert data["trace"][0]["node"] == "api-gateway"
    assert data["trace"][0]["fallback_fired"] is True
