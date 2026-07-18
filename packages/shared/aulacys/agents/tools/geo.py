"""Geo radius check — customer vs nearest SHB CN/PGD (synthetic)."""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from langchain_core.tools import tool

DEFAULT_MAX_KM = 50.0


def _now() -> str:
    return datetime.now(UTC).isoformat()


@lru_cache
def _load_geo() -> dict:
    path = Path(__file__).resolve().parents[1] / "resources" / "compliance" / "customer_geo.json"
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache
def _load_branches() -> dict:
    path = Path(__file__).resolve().parents[1] / "resources" / "compliance" / "branches.json"
    return json.loads(path.read_text(encoding="utf-8"))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlamba = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlamba / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def _nearest_branch(lat: float, lon: float, branches: list[dict[str, Any]]) -> tuple[dict[str, Any], float]:
    best = branches[0]
    best_km = haversine_km(lat, lon, float(best["lat"]), float(best["lon"]))
    for branch in branches[1:]:
        km = haversine_km(lat, lon, float(branch["lat"]), float(branch["lon"]))
        if km < best_km:
            best, best_km = branch, km
    return best, best_km


@tool
def geo_radius_check(id_number: str, max_km: float = DEFAULT_MAX_KM) -> dict:
    """Distance from customer to nearest CN/PGD. Missing coords ⇒ fail-closed."""
    normalized = (id_number or "").strip()
    geo = _load_geo()
    branches_doc = _load_branches()
    branches = list(branches_doc.get("branches") or [])
    radius = float(max_km if max_km is not None else geo.get("_meta", {}).get("max_radius_km", DEFAULT_MAX_KM))
    record = geo.get(normalized)

    if not record or record.get("lat") is None or record.get("lon") is None or not branches:
        return {
            "status": "missing",
            "id_number": normalized,
            "customer_id": None,
            "province": None,
            "distance_km": None,
            "max_km": radius,
            "within_radius": False,
            "nearest_branch": None,
            "source": "synthetic-geo-dataset",
            "dataset_version": geo["_meta"]["version"],
            "evidence_id": "GEO-MISSING",
            "record_found": False,
            "inputs": {"id_number": id_number, "max_km": radius},
            "computed_at": _now(),
        }

    lat, lon = float(record["lat"]), float(record["lon"])
    nearest, distance = _nearest_branch(lat, lon, branches)
    within = distance <= radius
    return {
        "status": "checked",
        "id_number": normalized,
        "customer_id": record.get("customer_id"),
        "province": record.get("province"),
        "address": record.get("address"),
        "lat": lat,
        "lon": lon,
        "distance_km": round(distance, 2),
        "max_km": radius,
        "within_radius": within,
        "nearest_branch": {
            "branch_id": nearest.get("branch_id"),
            "name": nearest.get("name"),
            "province": nearest.get("province"),
        },
        "source": "synthetic-geo-dataset",
        "dataset_version": geo["_meta"]["version"],
        "evidence_id": f"GEO-{normalized}",
        "record_found": True,
        "inputs": {"id_number": id_number, "max_km": radius},
        "computed_at": _now(),
    }
