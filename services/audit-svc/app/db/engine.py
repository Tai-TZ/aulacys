"""Postgres engine — required DATABASE_URL (docs/CONFIG.md, SUPABASE-SCHEMA-PER-SERVICE)."""

from __future__ import annotations

from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.config import get_settings


def _sync_url(url: str, schema: str) -> str:
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+psycopg"
    # Ensure search_path is set if caller did not put it in the URL.
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    if "options" not in query and schema:
        query["options"] = f"-csearch_path={schema}"
    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), ""))


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    return create_engine(
        _sync_url(settings.require_database_url(), settings.db_schema),
        pool_pre_ping=True,
        future=True,
    )


def ping() -> bool:
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def reset_engine_cache() -> None:
    get_engine.cache_clear()
