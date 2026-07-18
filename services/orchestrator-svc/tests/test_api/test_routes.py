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
    assert data["credit"]["proposed_limit"] == 2_500_000_000
    assert data["credit"]["proposed_rate"] is not None
    cic = data["credit"]["tool_results"]["cic_lookup"]
    assert cic["max_overdue_days"] == 0  # fallback when CIC_SVC_URL unset
    assert cic["cic_group"] == 1
    assert cic["has_bad_debt"] is False
    assert "overdue_days" in cic  # alias
    assert data["operations"]["valuation"] == 4_000_000_000
    assert data["operations"]["legal_flags"] == []
    assert data["compliance"]["veto"] is True
    assert data["compliance"]["kyc_status"] == "passed"
    assert data["critic"]["passed"] is True
    assert data["critic"]["memo"]
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
            "id_number": "001099000003",
            "cic_consent": True,
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
async def test_assess_by_application_id_maps_and_runs(client, monkeypatch):
    """application_id → application-svc payload → graph (no inline declared)."""
    from aulacys.agents.application_client import map_to_loan_application

    raw = {
        "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "product": "loan-unsecured-term",
        "total_amount": "250000000",
        "term_months": 36,
        "applicant": {"full_name": "Nguyen Van A", "id_number": "001099000001"},
        "financial": {"total_income": "35000000", "personal_expense": "3000000"},
        "consent": {"data_processing_consent": True},
        "purposes": [{"category": "consumer", "amount": "250000000", "purpose_detail": "tiêu dùng cá nhân"}],
    }

    monkeypatch.setattr(
        "app.api.routes.load_loan_application",
        lambda application_id, product_override=None, extra_documents=None: map_to_loan_application(
            raw, product_override=product_override, extra_documents=extra_documents
        ),
    )

    response = await client.post(
        "/api/v1/assess/application",
        json={"application_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["outcome"] == "stp_approved"
    assert data["credit"]["income"] == 35_000_000
    assert data["credit"]["tool_results"]["cic_lookup"]["cccd"] == "001099000001"


@pytest.mark.asyncio
async def test_assess_by_application_id_consent_denied(client, monkeypatch):
    from aulacys.agents.application_client import ConsentDeniedError

    def _deny(*_a, **_k):
        raise ConsentDeniedError("data_processing_consent must be true")

    monkeypatch.setattr("app.api.routes.load_loan_application", _deny)
    response = await client.post(
        "/api/v1/assess/application",
        json={"application_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"},
    )
    assert response.status_code == 400
    assert "consent" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_assess_by_application_id_unavailable(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.load_loan_application", lambda *_a, **_k: None)
    response = await client.post(
        "/api/v1/assess/application",
        json={"application_id": "00000000-0000-0000-0000-000000000001"},
    )
    assert response.status_code == 502


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
