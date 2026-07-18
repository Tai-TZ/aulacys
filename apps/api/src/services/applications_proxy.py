"""Proxy application-svc list/get — demo-proof empty list when unreachable."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from src.config import get_settings

logger = logging.getLogger(__name__)


def _base_url() -> str | None:
    url = (get_settings().application_svc_url or "").strip()
    return url.rstrip("/") if url else None


def list_applications(*, limit: int = 100) -> list[dict[str, Any]]:
    base = _base_url()
    if not base:
        return []
    try:
        req = urllib.request.Request(f"{base}/applications?limit={limit}")
        with urllib.request.urlopen(req, timeout=8) as resp:  # noqa: S310
            data = json.loads(resp.read().decode("utf-8"))
            return data if isinstance(data, list) else []
    except Exception:
        logger.exception("list_applications: application-svc unreachable")
        return []


def fetch_application(application_id: str) -> dict[str, Any] | None:
    base = _base_url()
    if not base:
        return None
    try:
        req = urllib.request.Request(f"{base}/applications/{application_id}")
        with urllib.request.urlopen(req, timeout=5) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        logger.exception("fetch_application HTTP error")
        return None
    except Exception:
        logger.exception("fetch_application failed")
        return None
