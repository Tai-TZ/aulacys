import json

from aulacys.agents.graph import load_product_config, seed_application
from aulacys.agents.nodes.credit import CreditSpec
from aulacys.agents.nodes.planner import PlannerSpec
from aulacys.agents.worker_client import run_agent


class FakeResponse:
    def __init__(self, payload: dict):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


def _state():
    app = seed_application("retail mortgage")
    return {
        "query": "retail mortgage",
        "application": app,
        "metadata": {
            "application_id": "retail-demo",
            "product_config": load_product_config(app.product),
            "request_id": "req-test",
        },
        "trace": [],
        "replan_count": 0,
    }


def test_run_agent_calls_worker_when_configured(monkeypatch):
    monkeypatch.delenv("AGENT_WORKER_URL", raising=False)
    monkeypatch.setenv("CREDIT_AGENT_URL", "http://credit-svc:8400")

    def fake_urlopen(req, timeout):
        assert req.full_url == "http://credit-svc:8400/run"
        assert req.headers["X-request-id"] == "req-test"
        assert timeout == 10
        return FakeResponse(
            {
                "agent": "credit",
                "request_id": "req-test",
                "output": {
                    "dti": 0.25,
                    "income": 100,
                    "recommendation": "support",
                    "evidence": [],
                    "tool_results": {"compute_dti": {"dti": 0.25}},
                },
                "tool_calls": ["compute_dti"],
                "latency_ms": 7,
            }
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    state = _state()
    result = run_agent(CreditSpec, state)

    assert result.dti == 0.25
    assert state["trace"][0].model == "http-worker:deterministic-fallback"
    assert state["trace"][0].fallback_fired is False
    assert state["trace"][0].tool_calls == ["compute_dti"]


def test_run_agent_falls_back_when_worker_fails(monkeypatch):
    monkeypatch.delenv("AGENT_WORKER_URL", raising=False)
    monkeypatch.setenv("CREDIT_AGENT_URL", "http://credit-svc:8400")

    def fake_urlopen(req, timeout):
        raise OSError("worker down")

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    state = _state()
    result = run_agent(CreditSpec, state)

    assert result.dti == 0.3878
    assert state["trace"][0].node == "credit"
    assert state["trace"][0].fallback_fired is True


def test_run_agent_prefers_shared_agent_worker_url(monkeypatch):
    monkeypatch.setenv("AGENT_WORKER_URL", "http://agent-worker-svc:8400")
    monkeypatch.setenv("CREDIT_AGENT_URL", "http://credit-svc:8400")

    def fake_urlopen(req, timeout):
        assert req.full_url == "http://agent-worker-svc:8400/run"
        assert timeout == 10
        return FakeResponse(
            {
                "agent": "credit",
                "request_id": "req-test",
                "output": {
                    "dti": 0.25,
                    "income": 100,
                    "recommendation": "support",
                    "evidence": [],
                    "tool_results": {"compute_dti": {"dti": 0.25}},
                },
                "tool_calls": ["compute_dti"],
                "latency_ms": 7,
            }
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    state = _state()
    result = run_agent(CreditSpec, state)

    assert result.dti == 0.25
    assert state["trace"][0].model == "http-worker:deterministic-fallback"


def test_run_agent_can_call_planner_through_shared_worker(monkeypatch):
    monkeypatch.setenv("AGENT_WORKER_URL", "http://agent-worker-svc:8400")

    def fake_urlopen(req, timeout):
        assert req.full_url == "http://agent-worker-svc:8400/run"
        payload = json.loads(req.data.decode("utf-8"))
        assert payload["agent"] == "planner"
        return FakeResponse(
            {
                "agent": "planner",
                "request_id": "req-test",
                "output": {
                    "nodes": ["planner", "credit"],
                    "edges": [["planner", "credit"]],
                    "rationale": "ok",
                    "plan_id": "retail_mortgage:r0:test",
                    "plan_hash": "a" * 64,
                    "warnings": [],
                },
                "tool_calls": [],
                "latency_ms": 4,
            }
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    state = _state()
    result = run_agent(PlannerSpec, state)

    assert result.nodes == ["planner", "credit"]
    assert state["trace"][0].node == "planner"
    assert state["trace"][0].model == "http-worker:deterministic-config"
