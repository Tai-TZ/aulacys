from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_parcel_valuation():
    r = client.post("/valuation", json={"collateral_value": 1, "parcel_id": "DEMO-001"})
    assert r.json()["valuation"] == 4000000000

def test_health():
    assert "DEMO-001" in client.get("/health").json()["seeded_parcels"]
