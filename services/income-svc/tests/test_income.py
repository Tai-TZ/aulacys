from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_verify():
    r = client.post("/verify", json={"declared_monthly_income": 10_000_000, "statement_monthly_income": 9_500_000})
    assert r.json()["variance"] == -500000.0

def test_health():
    assert client.get("/health").json()["status"] == "ok"
