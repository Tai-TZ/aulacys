from __future__ import annotations

from datetime import UTC, datetime

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


@tool
def cic_lookup(customer_name: str) -> dict:
    """Seeded CIC lookup for the demo path.

    Returns a deterministic record instead of calling an external CIC service.
    """
    return {
        "customer_name": customer_name,
        "score_band": "A",
        "overdue_days": 0,
        "active_loans": 1,
        "source": "seeded_cic_snapshot",
        "inputs": {"customer_name": customer_name},
        "computed_at": _now(),
    }
