from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from app.core.config import get_settings


@lru_cache
def load_seed() -> dict[str, Any]:
    return json.loads(get_settings().seed_path.read_text(encoding="utf-8"))
