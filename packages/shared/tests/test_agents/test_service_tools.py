import json
from pathlib import Path

from aulacys.agents.tools.aml import aml_screen
from aulacys.agents.tools.kyc import kyc_check
from aulacys.agents.tools.income import income_verify
from aulacys.agents.tools.property import property_valuation


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

    result = aml_screen.invoke({"sanctions_match_count": 0, "pep_match_count": 0, "customer_name": "Le Van Risky"})

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


def test_kyc_dataset_covers_low_and_high_risk_profiles():
    clean = kyc_check.invoke({"id_number": "001099000001", "consent_granted": True, "cccd_verified": True})
    assert clean["status"] == "passed"
    assert clean["dataset_version"].startswith("2026.")
    assert clean["registry_record_found"] is True
    assert clean["avatar"]
    assert clean["customer_id"] == "CUST-000001"

    high_risk = kyc_check.invoke({"id_number": "001099000010", "consent_granted": True, "cccd_verified": True})
    assert high_risk["status"] == "passed"
    assert high_risk["kyc_risk_level"] == "Cao"
    assert "enhanced_due_diligence_required" in high_risk["review_flags"]
    assert "pep_relationship_review_required" in high_risk["review_flags"]


def test_kyc_dataset_exposes_direct_pep_review():
    pep = kyc_check.invoke({"id_number": "001099000020", "consent_granted": True, "cccd_verified": True})
    assert pep["pep_flag"] == "Y"
    assert pep["relationship_to_pep"] == "Bản thân"
    assert "pep_screening_required" in pep["review_flags"]


def test_kyc_dataset_has_100_unique_synthetic_records():
    path = Path(__file__).resolve().parents[2] / "aulacys" / "agents" / "resources" / "compliance" / "kyc_records.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    records = {key: value for key, value in data.items() if not key.startswith("_")}
    assert data["_meta"]["record_count"] == 100
    assert len(records) == 100
    assert len(set(records)) == 100
    assert all("SYNTHETIC KYC PERSON" not in record["full_name"] for record in records.values())
    assert len({record["full_name"] for record in records.values()}) == 100
    expected_fields = {
        "customer_id",
        "full_name",
        "id_number",
        "date_of_birth",
        "nationality",
        "address",
        "occupation",
        "income_source",
        "declared_income",
        "customer_type",
        "business_sector",
        "onboarding_date",
        "kyc_risk_level",
        "pep_flag",
        "relationship_to_pep",
        "avatar",
    }
    assert all(set(record) == expected_fields for record in records.values())
    assert all(record["id_number"] == key for key, record in records.items())
    assert all(record["avatar"] for record in records.values())
