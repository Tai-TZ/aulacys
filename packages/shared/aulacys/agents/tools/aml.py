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
def aml_screen(
    sanctions_match_count: int = 0,
    pep_match_count: int = 0,
    customer_name: str | None = None,
) -> dict:
    """AML screen. Calls aml-svc when AML_SVC_URL is set, else seeded fallback."""
    from_svc = _from_service(
        "screen",
        {
            "sanctions_match_count": sanctions_match_count,
            "pep_match_count": pep_match_count,
            "customer_name": customer_name,
        },
    )
    if from_svc is not None:
        if all(
            isinstance(from_svc.get(key), int) and from_svc[key] >= 0
            for key in ("sanctions_match_count", "pep_match_count")
        ):
            return {"status": "checked", **from_svc}
        return {"status": "invalid", "error": "aml-svc returned malformed screening data", "computed_at": _now()}
    if os.getenv("AML_SVC_URL"):
        return {"status": "unavailable", "error": "aml-svc unavailable", "computed_at": _now()}

    if sanctions_match_count < 0 or pep_match_count < 0:
        return {"status": "invalid", "error": "match counts must not be negative", "computed_at": _now()}

    return {
        "status": "checked",
        "sanctions_match_count": sanctions_match_count,
        "pep_match_count": pep_match_count,
        "inputs": {
            "sanctions_match_count": sanctions_match_count,
            "pep_match_count": pep_match_count,
            "customer_name": customer_name,
        },
        "computed_at": _now(),
        "source": "seeded-fallback",
        "dataset_version": "2026.1",
        "evidence_id": "AML-DEMO-SCREEN",
    }


@tool
def related_party(exposure_ratio_related_group: float = 0) -> dict:
    """Related-party exposure screen. Calls aml-svc when AML_SVC_URL is set, else fallback."""
    from_svc = _from_service("related-party", {"exposure_ratio_related_group": exposure_ratio_related_group})
    if from_svc is not None:
        if isinstance(from_svc.get("exposure_ratio_related_group"), (int, float)):
            return {"status": "checked", **from_svc}
        return {"status": "invalid", "error": "aml-svc returned malformed related-party data", "computed_at": _now()}
    if os.getenv("AML_SVC_URL"):
        return {"status": "unavailable", "error": "aml-svc unavailable", "computed_at": _now()}

    if exposure_ratio_related_group < 0:
        return {
            "status": "invalid",
            "error": "exposure_ratio_related_group must not be negative",
            "computed_at": _now(),
        }

    return {
        "status": "checked",
        "exposure_ratio_related_group": exposure_ratio_related_group,
        "inputs": {"exposure_ratio_related_group": exposure_ratio_related_group},
        "computed_at": _now(),
    }
