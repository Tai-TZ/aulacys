"""cic-svc — mock of the national credit bureau (CIC) as its own service.

Owns seed reference data (cic_records.json). A real bank calls CIC over an external
API; here compliance/credit call this service. Unknown customers get the clean
default record, so the demo path never breaks on a missing customer.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

SEED = json.loads((Path(__file__).resolve().parent.parent / "seed" / "cic_records.json").read_text("utf-8"))

app = FastAPI(title="cic-svc", version="0.1.0")


class LookupRequest(BaseModel):
    customer_name: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "seeded_customers": [k for k in SEED if not k.startswith("_")]}


@app.post("/lookup")
def lookup(req: LookupRequest) -> dict:
    rec = SEED.get(req.customer_name, SEED["_default"])
    return {
        "customer_name": req.customer_name,
        "score_band": rec["score_band"],
        "overdue_days": rec["overdue_days"],
        "active_loans": rec["active_loans"],
        "source": "cic-svc",
        "inputs": {"customer_name": req.customer_name},
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }
