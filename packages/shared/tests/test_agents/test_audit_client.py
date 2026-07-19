"""post_audit must never 500 the assess path on missing-metric violations."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from aulacys.agents.audit_client import post_audit
from aulacys.agents.state import ComplianceVerdict, DeclaredForm, LoanApplication, RunTrace
from aulacys.policy.loader import PolicyViolation


def _state_with_missing_metric() -> dict:
    violation = PolicyViolation(
        rule_id="missing-ltv",
        description="Missing required metric: LTV",
        legal_basis="policy",
        metric="ltv",
        actual=None,
        threshold=0.9,
        operator="<=",
        unit="ratio",
        severity="blocking",
        raised_by="compliance",
        effective_from="2024-01-01",
        version="1",
        missing_metric=True,
    )
    return {
        "application": LoanApplication(
            product="retail_mortgage",
            declared=DeclaredForm(
                customer_name="Test",
                amount=800_000_000,
                term_months=180,
                monthly_income=25_000_000,
                declared_purpose="mua nha",
            ),
            documents=[],
        ),
        "metadata": {"application_id": "app-test"},
        "run_trace": RunTrace(lane=3, replan_count=1, veto_fired=True),
        "outcome": "vetoed",
        "replan_count": 1,
        "compliance": ComplianceVerdict(
            violations=[violation],
            veto=True,
            rule_ids=["missing-ltv"],
            kyc_status="passed",
            ubo_status="passed",
            rationale="veto",
            citations=[],
        ),
    }


def test_post_audit_handles_none_actual_without_raising(monkeypatch):
    monkeypatch.setenv("AUDIT_SVC_URL", "http://audit.test")
    captured: dict = {}

    class _Resp:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return b'{"id":"ok"}'

    def fake_urlopen(req, timeout=5):  # noqa: ARG001
        captured["body"] = json.loads(req.data.decode("utf-8"))
        return _Resp()

    with patch("aulacys.agents.audit_client.urllib.request.urlopen", fake_urlopen):
        result = post_audit(_state_with_missing_metric())

    assert result == {"id": "ok"}
    # Missing-metric rows (actual=None) are omitted — audit-svc requires floats.
    assert captured["body"]["violations"] == []
    assert captured["body"]["outcome"] == "vetoed"


def test_post_audit_swallows_build_errors(monkeypatch):
    monkeypatch.setenv("AUDIT_SVC_URL", "http://audit.test")
    bad = _state_with_missing_metric()
    bad["compliance"] = MagicMock()
    bad["compliance"].violations = [object()]  # no attributes → AttributeError
    assert post_audit(bad) is None
