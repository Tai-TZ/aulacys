"""property-svc - mock external valuation and land-registry service."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

SEED = json.loads((Path(__file__).resolve().parent.parent / "seed" / "parcel.json").read_text("utf-8"))

app = FastAPI(title="property-svc", version="0.1.0")


class ValuationRequest(BaseModel):
    collateral_value: float
    parcel_id: str | None = None


class LandRegistryRequest(BaseModel):
    has_dispute: bool = False
    zoning_flag: bool = False
    parcel_id: str | None = None


class DocChecklistRequest(BaseModel):
    required: list[str]
    provided: list[str]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "seeded_parcels": [k for k in SEED if not k.startswith("_")]}


@app.post("/valuation")
def valuation(req: ValuationRequest) -> dict:
    if req.collateral_value <= 0:
        return {"error": "collateral_value must be positive"}

    parcel = SEED.get(req.parcel_id or "", {})
    return {
        "valuation": parcel.get("valuation", req.collateral_value),
        "method": "property-svc_desktop_valuation",
        "source": "property-svc",
        "inputs": {"collateral_value": req.collateral_value, "parcel_id": req.parcel_id},
        "computed_at": datetime.now(UTC).isoformat(),
    }


@app.post("/land-registry")
def land_registry(req: LandRegistryRequest) -> dict:
    parcel = SEED.get(req.parcel_id or "", {})
    has_dispute = bool(parcel.get("has_dispute", req.has_dispute))
    zoning_flag = bool(parcel.get("zoning_flag", req.zoning_flag))
    flags: list[str] = []
    if has_dispute:
        flags.append("dispute")
    if zoning_flag:
        flags.append("zoning_flag")

    return {
        "clear": not flags,
        "legal_flags": flags,
        "source": "property-svc",
        "inputs": {"has_dispute": req.has_dispute, "zoning_flag": req.zoning_flag, "parcel_id": req.parcel_id},
        "computed_at": datetime.now(UTC).isoformat(),
    }


@app.post("/doc-checklist")
def doc_checklist(req: DocChecklistRequest) -> dict:
    missing = [doc for doc in req.required if doc not in set(req.provided)]
    return {
        "status": "complete" if not missing else "missing",
        "missing": missing,
        "source": "property-svc",
        "inputs": {"required": req.required, "provided": req.provided},
        "computed_at": datetime.now(UTC).isoformat(),
    }
