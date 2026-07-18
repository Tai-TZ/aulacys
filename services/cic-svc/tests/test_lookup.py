from fastapi.testclient import TestClient
from app.main import app
from app.services import cic as cic_service

client = TestClient(app)

def test_known_and_default():
    known = cic_service.lookup("Nguyen Van A")
    assert known["score_band"] == "A"
    assert known["source"] == "cic-svc"
    unknown = cic_service.lookup("Nobody")
    assert unknown["score_band"] == "A"  # _default

def test_routes():
    assert client.get("/health").json()["status"] == "ok"
    r = client.post("/lookup", json={"customer_name": "Le Van Risky"})
    assert r.status_code == 200
    assert r.json()["score_band"] == "D"
