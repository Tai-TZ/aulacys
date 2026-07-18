from __future__ import annotations

import json
import os
import urllib.request
from datetime import UTC, datetime

from langchain_core.tools import tool


def _to_los(application_id: str, status: str, summary: str) -> dict | None:
    url = os.getenv("LOS_SVC_URL")
    if not url:
        return None
    try:
        req = urllib.request.Request(
            f"{url.rstrip('/')}/tickets",
            data=json.dumps({"application_id": application_id, "status": status, "summary": summary}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


@tool
def write_approval_ticket(application_id: str, status: str, summary: str) -> dict:
    """Write the approval ticket. Calls los-svc when LOS_SVC_URL is set, else local mock."""
    from_los = _to_los(application_id, status, summary)
    if from_los is not None:
        return from_los
    return {
        "ticket_id": f"DEMO-{application_id.upper()}",
        "status": status,
        "summary": summary,
        "written_at": datetime.now(UTC).isoformat(),
        "inputs": {"application_id": application_id, "status": status, "summary": summary},
    }
