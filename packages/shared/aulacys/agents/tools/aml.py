from __future__ import annotations

import json
import os
import urllib.request
from datetime import UTC, datetime

from langchain_core.tools import tool


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _from_service(path: str, payload: dict) -> dict | None:
    url = os.getenv("AML_SVC_URL")
    if not url:
        return None
    try:
        req = urllib.request.Request(
            f"{url.rstrip('/')}/{path.lstrip('/')}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


@tool
def aml_screen(sanctions_match_count: int = 0, pep_match_count: int = 0) -> dict:
    """AML screen. Calls aml-svc when AML_SVC_URL is set, else seeded fallback."""
    from_svc = _from_service(
        "screen",
        {"sanctions_match_count": sanctions_match_count, "pep_match_count": pep_match_count},
    )
    if from_svc is not None:
        return from_svc

    if sanctions_match_count < 0 or pep_match_count < 0:
        return {"error": "match counts must not be negative"}

    return {
        "sanctions_match_count": sanctions_match_count,
        "pep_match_count": pep_match_count,
        "inputs": {
            "sanctions_match_count": sanctions_match_count,
            "pep_match_count": pep_match_count,
        },
        "computed_at": _now(),
    }


@tool
def related_party(exposure_ratio_related_group: float = 0) -> dict:
    """Related-party exposure screen. Calls aml-svc when AML_SVC_URL is set, else fallback."""
    from_svc = _from_service("related-party", {"exposure_ratio_related_group": exposure_ratio_related_group})
    if from_svc is not None:
        return from_svc

    if exposure_ratio_related_group < 0:
        return {"error": "exposure_ratio_related_group must not be negative"}

    return {
        "exposure_ratio_related_group": exposure_ratio_related_group,
        "inputs": {"exposure_ratio_related_group": exposure_ratio_related_group},
        "computed_at": _now(),
    }
