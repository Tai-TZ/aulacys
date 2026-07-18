"""Postgres engine — DATABASE_URL required; prefer DIRECT_URL for session pooler."""

from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url

from app.core.config import get_settings


def _sync_url(url: str, schema: str) -> str:
    """Normalize for psycopg; drop Prisma ``pgbouncer`` query flag; force search_path."""
    u = make_url(url)
    query = {k: v for k, v in dict(u.query).items() if k != "pgbouncer"}
    if schema:
        # Always override — pooler/role defaults (e.g. ``los``) must not win.
        query["options"] = f"-csearch_path={schema}"
    return u.set(drivername="postgresql+psycopg", query=query).render_as_string(hide_password=False)


def _runtime_url(settings) -> str:
    """Prefer DIRECT_URL (session pooler) so search_path sticks; fall back to DATABASE_URL."""
    raw = (settings.direct_url or settings.database_url or "").strip()
    if not raw.startswith("postgres"):
        raise RuntimeError(
            "Set DIRECT_URL or DATABASE_URL (Postgres) — SQLite is removed"
        )
    return raw


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    schema = settings.db_schema
    # prepare_threshold=None: required for Supabase transaction pooler (PgBouncer).
    engine = create_engine(
        _sync_url(_runtime_url(settings), schema),
        pool_pre_ping=True,
        future=True,
        connect_args={"prepare_threshold": None},
    )

    @event.listens_for(engine, "connect")
    def _set_search_path(dbapi_connection, _connection_record) -> None:  # noqa: ANN001
        # Belt-and-suspenders: URL options are ignored by some pooler paths.
        with dbapi_connection.cursor() as cur:
            cur.execute(f"SET search_path TO {schema}, public")

    return engine


def ping() -> bool:
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def reset_engine_cache() -> None:
    get_engine.cache_clear()
