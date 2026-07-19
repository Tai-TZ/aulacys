from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_screen_hit():
    r = client.post("/screen", json={"customer_name": "Le Van Risky"})
    assert r.json()["sanctions_match_count"] >= 1


def test_routes():
    assert client.get("/health").json()["status"] == "ok"
    assert (
        client.post(
            "/related-party", json={"exposure_ratio_related_group": 0.1}
        ).json()["source"]
        == "aml-svc"
    )


def test_dataset_provenance_alias_and_pep():
    health = client.get("/health").json()
    assert health["dataset_version"] == "2026.1"
    assert health["sanctions_records"] == 50
    assert health["pep_records"] == 50

    sanctions = client.post("/screen", json={"customer_name": "risky le"}).json()
    assert sanctions["status"] == "checked"
    assert sanctions["sanctions_match_count"] == 1
    assert sanctions["evidence_id"] == "SAN-UN-001"
    assert sanctions["matches"][0]["source_url"].startswith("https://")

    pep = client.post("/screen", json={"customer_name": "Tran B"}).json()
    assert pep["pep_match_count"] == 1
    assert pep["evidence_id"] == "PEP-VN-001"
