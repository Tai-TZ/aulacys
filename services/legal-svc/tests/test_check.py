from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services import legal as legal_service

client = TestClient(app)


def test_clean_cccd_is_clear():
    out = legal_service.check("001099000001")
    assert out["result"] == "CLEAR"
    assert out["is_blacklisted"] is False
    assert out["blocking"] is False
    assert out["matches"] == []
    assert out["source"] == "legal-svc"


def test_police_wanted_is_blocking_hit():
    out = legal_service.check("001099000010")
    assert out["result"] == "HIT"
    assert out["is_blacklisted"] is True
    assert out["blocking"] is True
    assert any(m["list"] == "police_wanted" for m in out["matches"])


def test_court_judgment_is_blocking_hit():
    out = legal_service.check("001099000011")
    assert out["result"] == "HIT"
    assert out["blocking"] is True
    assert any(m["list"] == "court_judgment" for m in out["matches"])


def test_internal_watch_is_hit_but_not_blocking():
    out = legal_service.check("001099000012")
    assert out["result"] == "HIT"
    assert out["blocking"] is False
    assert out["is_blacklisted"] is False
    assert out["matches"][0]["severity"] == "review"


def test_name_only_possible_hit():
    out = legal_service.check("999999999999", full_name="Nguyen Van Ghost")
    assert out["result"] == "POSSIBLE_HIT"
    assert out["blocking"] is False
    assert out["matches"][0]["match_type"] == "name"


def test_unknown_cccd_defaults_clear():
    out = legal_service.check("888888888888")
    assert out["result"] == "CLEAR"
    assert out["source"] == "legal-svc"


def test_routes():
    assert client.get("/health").json()["status"] == "ok"
    r = client.post("/check", json={"cccd": "001099000010"})
    assert r.status_code == 200
    body = r.json()
    assert body["result"] == "HIT"
    assert body["blocking"] is True


def test_invalid_cccd_rejected():
    assert client.post("/check", json={"cccd": "123"}).status_code == 422
    assert client.post("/check", json={"cccd": "abcdefghijkl"}).status_code == 422
