"""Best-effort audit write to audit-svc.

Posts the decision to `AUDIT_SVC_URL` when set. Best-effort by design: a dead audit
service must never break the decision path (in production this is an async
`DecisionRecorded` event; here it is a fire-and-forget HTTP POST that swallows errors).
No-op when the env var is unset, so the monolith runs standalone.

Uses urllib (stdlib) — no new dependency.
"""

from __future__ import annotations

import json
import os
import urllib.request
from datetime import date
from typing import Any

from src.agents.state import AgentState


def post_audit(state: AgentState) -> dict[str, Any] | None:
    url = os.getenv("AUDIT_SVC_URL")
    if not url:
        return None
    app = state.get("application")
    run_trace = state.get("run_trace")
    if app is None or run_trace is None:
        return None
    compliance = state.get("compliance")
    violations = []
    if compliance is not None:
        for v in compliance.violations:
            violations.append(
                {
                    "rule_id": v.rule_id,
                    # PolicyViolation has no explicit version yet; stand in with the
                    # effective date until loader.py adds a real `version` (TODO).
                    "rule_version": f"ef:{v.effective_from}",
                    "effective_from": v.effective_from,
                    "legal_basis": v.legal_basis,
                    "metric_name": v.metric,
                    "metric_value": float(v.actual),
                    "threshold": float(v.threshold),
                    "is_blocking": v.is_blocking,
                }
            )
    payload = {
        "application_id": state.get("metadata", {}).get("application_id", "retail-demo"),
        "product": app.product,
        "lane": run_trace.lane,
        "outcome": state.get("outcome", ""),
        "veto_fired": run_trace.veto_fired,
        "replan_count": state.get("replan_count", 0),
        "as_of": date.today().isoformat(),
        "signed_by": "system",  # HITL approver not built yet
        "violations": violations,
    }
    try:
        req = urllib.request.Request(
            f"{url.rstrip('/')}/records",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310 (trusted internal URL)
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None  # best-effort: never break the decision path
