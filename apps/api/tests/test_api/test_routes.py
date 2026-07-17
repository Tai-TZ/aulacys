import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_chat_empty_message(client):
    response = await client.post("/api/v1/chat", json={"message": ""})
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_agent_status(client):
    response = await client.get("/api/v1/status")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_assess_returns_structured_veto(client):
    response = await client.post("/api/v1/assess", json={"message": "retail mortgage"})
    assert response.status_code == 200
    data = response.json()
    assert data["outcome"] == "vetoed"
    assert data["run_trace"]["lane"] == 3
    assert data["run_trace"]["replan_count"] == 2
    assert data["credit"]["dti"] == 0.3878
    assert data["credit"]["tool_results"]["cic_lookup"]["score_band"] == "A"
    assert data["operations"]["valuation"] == 4_000_000_000
    assert data["operations"]["legal_flags"] == []
    assert data["compliance"]["veto"] is True
    assert any(item["node"] == "compliance" for item in data["trace"])


@pytest.mark.asyncio
async def test_assess_empty_message(client):
    response = await client.post("/api/v1/assess", json={"message": ""})
    assert response.status_code == 422
