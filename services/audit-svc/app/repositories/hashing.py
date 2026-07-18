"""Hash-chain helpers shared by SQLite and Postgres ledgers."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def content_hash(core: dict[str, Any], prev_hash: str | None) -> str:
    payload = json.dumps(core, sort_keys=True, ensure_ascii=False) + (prev_hash or "")
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def canonicalize_violations(violations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "rule_id": v["rule_id"],
            "rule_version": v["rule_version"],
            "effective_from": v["effective_from"],
            "legal_basis": v["legal_basis"],
            "metric_name": v["metric_name"],
            "metric_value": float(v["metric_value"]),
            "threshold": (float(v["threshold"]) if v.get("threshold") is not None else None),
            "is_blocking": bool(v["is_blocking"]),
        }
        for v in violations
    ]
