from __future__ import annotations

import json
import os
import urllib.request
from datetime import UTC, datetime

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _from_service(customer_name: str) -> dict | None:
    url = os.getenv("CIC_SVC_URL")
    if not url:
        return None
    try:
        req = urllib.request.Request(
            f"{url.rstrip('/')}/lookup",
            data=json.dumps({"customer_name": customer_name}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


@tool
def cic_lookup(customer_name: str) -> dict:
    """CIC lookup. Calls cic-svc when CIC_SVC_URL is set, else seeded fallback."""
    from_svc = _from_service(customer_name)
    if from_svc is not None:
        return from_svc
    return {
        "customer_name": customer_name,
        "score_band": "A",
        "overdue_days": 0,
        "active_loans": 1,
        "source": "seeded_cic_snapshot",
        "inputs": {"customer_name": customer_name},
        "computed_at": _now(),
    }
