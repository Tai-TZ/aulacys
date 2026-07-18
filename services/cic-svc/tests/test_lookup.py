from fastapi.testclient import TestClient

from app.main import app
from app.services import cic as cic_service
from app.services import scoring

client = TestClient(app)


def test_scorecard_weights_sum_to_one():
    assert abs(sum(scoring.WEIGHTS.values()) - 1.0) < 1e-9


def test_scorecard_range_and_pd_monotonic():
    good = scoring.score_profile(
        {
            "total_outstanding_vnd": 50_000_000,
            "credit_limit_total_vnd": 500_000_000,
            "max_overdue_days": 0,
            "overdue_amount_vnd": 0,
            "credit_history_months": 84,
            "credit_types": ["secured", "unsecured", "card"],
            "inquiries_last_6m": 0,
        }
    )
    bad = scoring.score_profile(
        {
            "total_outstanding_vnd": 900_000_000,
            "credit_limit_total_vnd": 500_000_000,
            "max_overdue_days": 400,
            "overdue_amount_vnd": 200_000_000,
            "credit_history_months": 2,
            "credit_types": [],
            "inquiries_last_6m": 12,
        }
    )
    assert scoring.SCORE_MIN <= good["score"] <= scoring.SCORE_MAX
    assert scoring.SCORE_MIN <= bad["score"] <= scoring.SCORE_MAX
    assert good["score"] > bad["score"]
    assert good["pd"] < bad["pd"]
    assert good["cic_group"] == 1
    assert bad["cic_group"] == 5


def test_utilization_penalty_above_30_percent():
    low = scoring.encode_utilization(100, 1000)  # 10%
    mid = scoring.encode_utilization(400, 1000)  # 40%
    assert low == 1.0
    assert mid < low


def test_known_cccd_group_and_score():
    good = cic_service.lookup("001099000001", consent_granted=True)
    assert good["cic_group"] == 1
    assert good["debt_group"] == 1
    assert good["classification"] == "Nợ đủ tiêu chuẩn"
    assert good["has_bad_debt"] is False
    assert good["customer_id"] == "CUST-000001"
    assert good["full_name"] == "NGUYỄN VĂN AN"
    assert good["outstanding_debt"] == 40_000_000
    assert good["number_of_institutions"] == 1
    assert good["overdue_history"]["count"] == 0
    assert good["overdue_history"]["max_days"] == 0
    assert 403 <= good["score"] <= 706
    assert good["score_breakdown"]["weights"]["payment_history"] == 0.35
    assert good["source"] == "cic-svc"

    bad = cic_service.lookup("001099000005", consent_granted=True)
    assert bad["cic_group"] == 5
    assert bad["debt_group"] == 5
    assert bad["has_bad_debt"] is True
    assert bad["overdue_history"]["count"] >= 1
    assert bad["number_of_institutions"] >= 1
    assert bad["score"] < good["score"]


def test_seeded_groups_cover_1_through_5():
    expected = {
        "001099000001": 1,
        "001099000002": 2,
        "001099000003": 3,
        "001099000004": 4,
        "001099000005": 5,
    }
    for cccd, group in expected.items():
        out = cic_service.lookup(cccd, consent_granted=True)
        assert out["cic_group"] == group, cccd
        assert out["debt_group"] == group, cccd


def test_dataset_has_100_unique_records_and_balanced_groups():
    cccds = cic_service.seeded_cccds()
    assert len(cccds) == 100
    assert len(set(cccds)) == 100
    counts = {group: 0 for group in range(1, 6)}
    for cccd in cccds:
        out = cic_service.lookup(cccd, consent_granted=True)
        counts[out["cic_group"]] += 1
        assert out["customer_id"]
        assert "outstanding_debt" in out
        assert "number_of_institutions" in out
        assert "overdue_history" in out
        assert out["debt_group"] == out["cic_group"]
    assert counts == {1: 20, 2: 20, 3: 20, 4: 20, 5: 20}


def test_unknown_cccd_uses_default():
    unknown = cic_service.lookup("999999999999", consent_granted=True)
    assert unknown["cic_group"] == 1
    assert unknown["debt_group"] == 1
    assert unknown["source"] == "cic-svc"
    assert 403 <= unknown["score"] <= 706


def test_consent_required():
    denied = cic_service.lookup("001099000001", consent_granted=False)
    assert denied["error"] == "consent_required"

    r = client.post("/lookup", json={"cccd": "001099000001", "consent_granted": False})
    assert r.status_code == 403


def test_routes():
    assert client.get("/health").json()["status"] == "ok"
    r = client.post(
        "/lookup",
        json={"cccd": "001099000003", "consent_granted": True},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["cic_group"] == 3
    assert body["debt_group"] == 3
    assert body["has_bad_debt"] is True
    assert "pd" in body
    assert body["score_breakdown"]["scorecard_version"] == "mock-cic-v1"
    assert body["dataset_version"] == "2026.2"
    assert body["evidence_id"] == "CIC-001099000003"
    assert body["record_found"] is True
    assert body["monthly_debt_obligation_vnd"] == 9_000_000
    assert body["customer_id"] == "CUST-000003"
    assert body["outstanding_debt"] == body["total_outstanding_vnd"]
    assert body["number_of_institutions"] >= 1
    assert body["overdue_history"]["max_days"] == body["max_overdue_days"]


def test_invalid_cccd_rejected():
    assert (
        client.post(
            "/lookup", json={"cccd": "123", "consent_granted": True}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/lookup", json={"cccd": "abcdefghijkl", "consent_granted": True}
        ).status_code
        == 422
    )


def test_unknown_record_is_explicitly_labelled_default():
    body = client.post(
        "/lookup",
        json={"cccd": "999999999999", "consent_granted": True},
    ).json()
    assert body["record_found"] is False
    assert body["evidence_id"] == "CIC-SYNTHETIC-DEFAULT"
