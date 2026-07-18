"""Postgres engine — DATABASE_URL required."""

from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url

from app.core.config import get_settings


def _sync_url(url: str, schema: str) -> str:
    """Normalize for psycopg; drop Prisma ``pgbouncer`` query flag."""
    u = make_url(url)
    query = {k: v for k, v in dict(u.query).items() if k != "pgbouncer"}
    if "options" not in query and schema:
        query["options"] = f"-csearch_path={schema}"
    return u.set(drivername="postgresql+psycopg", query=query).render_as_string(hide_password=False)


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
