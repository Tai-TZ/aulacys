"""Proxy application-svc list/get — returns None when unreachable."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from aulacys.config import get_settings

logger = logging.getLogger(__name__)


def _base_url() -> str | None:
    url = (get_settings().application_svc_url or "").strip()
    return url.rstrip("/") if url else None


def list_applications(*, limit: int = 100) -> list[dict[str, Any]] | None:
    """Return dossiers from application-svc, or None if the service is unreachable."""
    base = _base_url()
    if not base:
        return None
    url = f"{base}/applications?limit={limit}"
    last_exc: Exception | None = None
    # Cold Supabase / local wake can flake once — one retry keeps the demo path alive.
    for attempt in range(2):
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=40) as resp:  # noqa: S310
                data = json.loads(resp.read().decode("utf-8"))
                return data if isinstance(data, list) else []
        except Exception as exc:
            last_exc = exc
            logger.warning("list_applications attempt %s failed: %s", attempt + 1, exc)
    logger.exception("list_applications: application-svc unreachable", exc_info=last_exc)
    return None


def fetch_application(application_id: str) -> dict[str, Any] | None:
    base = _base_url()
    if not base:
        return None
    try:
        req = urllib.request.Request(f"{base}/applications/{application_id}")
        with urllib.request.urlopen(req, timeout=40) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        logger.exception("fetch_application HTTP error")
        return None
    except Exception:
        logger.exception("fetch_application failed")
        return None
