import json

from src.agents.tools.aml import aml_screen
from src.agents.tools.income import income_verify
from src.agents.tools.property import property_valuation


class FakeResponse:
    def __init__(self, payload: dict):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


def test_aml_screen_uses_service_when_configured(monkeypatch):
    monkeypatch.setenv("AML_SVC_URL", "http://aml-svc")

    def fake_urlopen(req, timeout):
        assert req.full_url == "http://aml-svc/screen"
        assert timeout == 5
        return FakeResponse({"sanctions_match_count": 1, "pep_match_count": 0, "source": "aml-svc"})

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    result = aml_screen.invoke({"sanctions_match_count": 0, "pep_match_count": 0})

    assert result["source"] == "aml-svc"
    assert result["sanctions_match_count"] == 1


def test_property_valuation_uses_service_when_configured(monkeypatch):
    monkeypatch.setenv("PROPERTY_SVC_URL", "http://property-svc")

    def fake_urlopen(req, timeout):
        assert req.full_url == "http://property-svc/valuation"
        assert timeout == 5
        return FakeResponse({"valuation": 5_000_000_000, "source": "property-svc"})

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    result = property_valuation.invoke({"collateral_value": 4_800_000_000})

    assert result["source"] == "property-svc"
    assert result["valuation"] == 5_000_000_000


def test_income_verify_uses_service_when_configured(monkeypatch):
    monkeypatch.setenv("INCOME_SVC_URL", "http://income-svc")

    def fake_urlopen(req, timeout):
        assert req.full_url == "http://income-svc/verify"
        assert timeout == 5
        return FakeResponse({"verified_monthly_income": 85_000_000, "source": "income-svc"})

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    result = income_verify.invoke({"declared_monthly_income": 90_000_000, "statement_monthly_income": 85_000_000})

    assert result["source"] == "income-svc"
    assert result["verified_monthly_income"] == 85_000_000


def test_service_tool_falls_back_when_service_unavailable(monkeypatch):
    monkeypatch.setenv("INCOME_SVC_URL", "http://income-svc")

    def fake_urlopen(req, timeout):
        raise OSError("service down")

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    result = income_verify.invoke({"declared_monthly_income": 90_000_000, "statement_monthly_income": 85_000_000})

    assert result["source"] == "seeded_bank_statement"
    assert result["verified_monthly_income"] == 85_000_000
