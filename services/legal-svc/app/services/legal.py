"""Mock Vietnam legal / police blacklist screen for retail lending.

Distinct from aml-svc (international sanctions / PEP). This service models:
- police wanted lists (Cục Cảnh sát / C06-style)
- court criminal judgments
- bank internal legal blacklist

Seeded JSON only — no real government API.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.repositories import seed as repo

_VALID_LISTS = frozenset({"police_wanted", "court_judgment", "bank_internal"})
_VALID_SEVERITIES = frozenset({"blocking", "review"})


def _normalize_name(name: str | None) -> str:
    return " ".join((name or "").strip().split())


def seeded_cccds() -> list[str]:
    data = repo.load_seed()
    return sorted(k for k in data.get("by_cccd", {}) if not k.startswith("_"))


def health_payload() -> dict[str, Any]:
    data = repo.load_seed()
    return {
        "status": "ok",
        "seeded_cccds": seeded_cccds(),
        "police_wanted": sum(
            1
            for rec in data.get("by_cccd", {}).values()
            for h in rec.get("hits", [])
            if h.get("list") == "police_wanted"
        ),
        "court_judgments": sum(
            1
            for rec in data.get("by_cccd", {}).values()
            for h in rec.get("hits", [])
            if h.get("list") == "court_judgment"
        ),
        "bank_internal": sum(
            1
            for rec in data.get("by_cccd", {}).values()
            for h in rec.get("hits", [])
            if h.get("list") == "bank_internal"
        ),
        "name_only_entries": len(data.get("by_name", {})),
    }


def _normalize_hit(raw: dict[str, Any], *, match_type: str) -> dict[str, Any] | None:
    list_id = str(raw.get("list", ""))
    severity = str(raw.get("severity", "review"))
    if list_id not in _VALID_LISTS or severity not in _VALID_SEVERITIES:
        return None
    return {
        "list": list_id,
        "code": str(raw.get("code", "UNKNOWN")),
        "severity": severity,
        "detail": str(raw.get("detail", "")),
        "match_type": match_type,
    }


def check(cccd: str, full_name: str | None = None) -> dict[str, Any]:
    """Screen CCCD (+ optional name) against seeded legal blacklists.

    Unknown CCCD → clear default so the demo path never crashes.
    """
    data = repo.load_seed()
    by_cccd = data.get("by_cccd", {})
    rec = by_cccd.get(cccd, data.get("_default", {"full_name": "", "hits": []}))

    matches: list[dict[str, Any]] = []
    for raw in rec.get("hits") or []:
        hit = _normalize_hit(raw, match_type="cccd")
        if hit:
            matches.append(hit)

    resolved_name = str(rec.get("full_name") or "") or _normalize_name(full_name)
    name_key = _normalize_name(full_name) or resolved_name

    # Name-only soft matches when CCCD itself has no hits
    if not matches and name_key:
        for raw in data.get("by_name", {}).get(name_key, []):
            hit = _normalize_hit(raw, match_type="name")
            if hit:
                matches.append(hit)

    has_blocking_cccd = any(m["severity"] == "blocking" and m["match_type"] == "cccd" for m in matches)
    has_any_cccd = any(m["match_type"] == "cccd" for m in matches)
    has_name_only = bool(matches) and not has_any_cccd

    if has_blocking_cccd or has_any_cccd:
        result = "HIT"
    elif has_name_only:
        result = "POSSIBLE_HIT"
    else:
        result = "CLEAR"

    blocking = has_blocking_cccd
    return {
        "cccd": cccd,
        "full_name": resolved_name,
        "result": result,
        "is_blacklisted": blocking,
        "blocking": blocking,
        "matches": matches,
        "source": "legal-svc",
        "inputs": {"cccd": cccd, "full_name": full_name},
        "computed_at": datetime.now(UTC).isoformat(),
    }
