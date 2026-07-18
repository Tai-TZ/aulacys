from __future__ import annotations
from datetime import UTC, datetime
from app.repositories import seed as repo

def seeded_customers() -> list[str]:
    return [k for k in repo.load_seed() if not k.startswith("_")]

def lookup(customer_name: str) -> dict:
    data = repo.load_seed()
    rec = data.get(customer_name, data["_default"])
    return {
        "customer_name": customer_name,
        "score_band": rec["score_band"],
        "overdue_days": rec["overdue_days"],
        "active_loans": rec["active_loans"],
        "source": "cic-svc",
        "inputs": {"customer_name": customer_name},
        "computed_at": datetime.now(UTC).isoformat(),
    }
