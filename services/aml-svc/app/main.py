"""aml-svc - mock sanctions/PEP and related-party screening service.

Owns seeded screening lists. Unknown customers and explicit zero counts return a
clean result so the monolith can keep the demo moving even with sparse data.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

SEED = json.loads((Path(__file__).resolve().parent.parent / "seed" / "aml_lists.json").read_text("utf-8"))

app = FastAPI(title="aml-svc", version="0.1.0")


class ScreenRequest(BaseModel):
    sanctions_match_count: int = 0
    pep_match_count: int = 0
    customer_name: str | None = None


class RelatedPartyRequest(BaseModel):
    exposure_ratio_related_group: float = 0


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "sanctions_records": len(SEED["sanctions_list"]),
        "pep_records": len(SEED["pep_list"]),
    }


@app.post("/screen")
def screen(req: ScreenRequest) -> dict:
    sanctions_names = set(SEED["sanctions_list"])
    pep_names = set(SEED["pep_list"])
    sanctions_count = req.sanctions_match_count
    pep_count = req.pep_match_count

    if req.customer_name in sanctions_names:
        sanctions_count = max(sanctions_count, 1)
    if req.customer_name in pep_names:
        pep_count = max(pep_count, 1)

    if sanctions_count < 0 or pep_count < 0:
        return {"error": "match counts must not be negative"}

    return {
        "sanctions_match_count": sanctions_count,
        "pep_match_count": pep_count,
        "source": "aml-svc",
        "inputs": {
            "sanctions_match_count": req.sanctions_match_count,
            "pep_match_count": req.pep_match_count,
            "customer_name": req.customer_name,
        },
        "computed_at": datetime.now(UTC).isoformat(),
    }


@app.post("/related-party")
def related_party(req: RelatedPartyRequest) -> dict:
    if req.exposure_ratio_related_group < 0:
        return {"error": "exposure_ratio_related_group must not be negative"}

    return {
        "exposure_ratio_related_group": req.exposure_ratio_related_group,
        "source": "aml-svc",
        "inputs": {"exposure_ratio_related_group": req.exposure_ratio_related_group},
        "computed_at": datetime.now(UTC).isoformat(),
    }
