from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_screen_hit():
    r = client.post("/screen", json={"customer_name": "Le Van Risky"})
    assert r.json()["sanctions_match_count"] >= 1

def test_routes():
    assert client.get("/health").json()["status"] == "ok"
    assert client.post("/related-party", json={"exposure_ratio_related_group": 0.1}).json()["source"] == "aml-svc"
