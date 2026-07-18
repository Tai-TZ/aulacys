"""Postgres engine — DATABASE_URL required (Supabase transaction pooler safe)."""

from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.pool import NullPool

from app.core.config import get_settings


def _sync_url(url: str, schema: str) -> str:
    """Normalize for psycopg; drop Prisma ``pgbouncer`` query flag (invalid for libpq)."""
    u = make_url(url)
    query = {k: v for k, v in dict(u.query).items() if k != "pgbouncer"}
    if "options" not in query and schema:
        query["options"] = f"-csearch_path={schema}"
    return u.set(drivername="postgresql+psycopg", query=query).render_as_string(hide_password=False)


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    schema = settings.db_schema
    engine = create_engine(
        _sync_url(settings.require_database_url(), schema),
        # PgBouncer transaction mode (:6543): no server-side prepared stmts, no app-side pool.
        poolclass=NullPool,
        pool_pre_ping=True,
        future=True,
        connect_args={"prepare_threshold": None},
    )

    if schema:

        @event.listens_for(engine, "connect")
        def _set_search_path(dbapi_conn: object, _connection_record: object) -> None:
            # Pooler often ignores URL options=-csearch_path; set explicitly per checkout.
            with dbapi_conn.cursor() as cur:  # type: ignore[attr-defined]
                cur.execute(f'SET search_path TO "{schema}"')

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
