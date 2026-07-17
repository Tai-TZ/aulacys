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


@pytest.mark.asyncio
async def test_assess_application_runs_submitted_mortgage_veto(client):
    """POST /assess/application uses the body — not seed_application()."""
    payload = {
        "product": "retail_mortgage",
        "declared": {
            "customer_name": "Tran Thi B",
            "amount": 2_500_000_000,
            "term_months": 240,
            "annual_rate": 0.105,
            "monthly_income": 85_000_000,
            "existing_monthly_debt": 8_000_000,
            "declared_purpose": "mua nhà để ở",
            "collateral_value_declared": 4_000_000_000,
        },
        "documents": [
            {"kind": "cccd", "tier": 1, "extracted": {"verified": True}},
            {"kind": "sao_ke_tai_khoan", "tier": 1, "extracted": {"monthly_income": 85_000_000}},
            {"kind": "so_do", "tier": 2, "extracted": {"parcel": "DEMO-001"}},
            {"kind": "hop_dong_mua_ban", "tier": 2, "extracted": {"seller": "Demo Seller"}},
            {"kind": "cic", "tier": 1, "extracted": {"score_band": "A"}},
            {
                "kind": "purpose_evidence",
                "tier": 2,
                "extracted": {"actual_purpose": "tất toán khoản vay ở TCTD khác"},
            },
        ],
    }
    response = await client.post("/api/v1/assess/application", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["outcome"] == "vetoed"
    assert data["run_trace"]["veto_fired"] is True
    assert data["run_trace"]["replan_count"] == 2
    assert data["compliance"]["veto"] is True
    assert "prohibited_purpose_refinance_other_bank" in data["compliance"]["rule_ids"]
    assert sum(1 for item in data["trace"] if item["node"] == "compliance") == 3


@pytest.mark.asyncio
async def test_assess_application_unknown_product(client):
    response = await client.post(
        "/api/v1/assess/application",
        json={
            "product": "not_a_product",
            "declared": {
                "customer_name": "X",
                "amount": 1,
                "term_months": 12,
                "monthly_income": 1,
                "declared_purpose": "test",
            },
            "documents": [],
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_approval_writes_human_ticket(client):
    response = await client.post(
        "/api/v1/approvals",
        json={
            "application_id": "retail-demo",
            "decision": "approved",
            "signed_by": "officer-a",
            "note": "ok after review",
            "prior_outcome": "ready_for_human_approval",
            "prior_ticket_id": "DEMO-RETAIL-DEMO",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "approved"
    assert data["signed_by"] == "officer-a"
    assert data["ticket"]["status"] == "human_approved"
    assert "HITL approved" in data["ticket"]["summary"]


@pytest.mark.asyncio
async def test_approval_rejects(client):
    response = await client.post(
        "/api/v1/approvals",
        json={"application_id": "retail-demo", "decision": "rejected"},
    )
    assert response.status_code == 200
    assert response.json()["ticket"]["status"] == "human_rejected"
