from __future__ import annotations

from datetime import UTC, datetime

from langchain_core.tools import tool


@tool
def write_approval_ticket(application_id: str, status: str, summary: str) -> dict:
    """Mock write into a banking workflow system.

    This is deliberately deterministic and local: the demo proves a real action shape
    without integrating a core-banking system.
    """
    return {
        "ticket_id": f"DEMO-{application_id.upper()}",
        "status": status,
        "summary": summary,
        "written_at": datetime.now(UTC).isoformat(),
        "inputs": {"application_id": application_id, "status": status, "summary": summary},
    }
