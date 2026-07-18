"""Load catalog seed JSON once."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from app.core.config import get_settings


@lru_cache
def load_catalog() -> dict[str, Any]:
    path = get_settings().catalog_seed
    return json.loads(path.read_text(encoding="utf-8"))


def clear_cache() -> None:
    load_catalog.cache_clear()
