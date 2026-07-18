"""Postgres engine — DATABASE_URL required."""

from __future__ import annotations

from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine

from app.core.config import get_settings


def _sync_url(url: str) -> tuple[str, dict]:
    """Build a psycopg URL + connect_args.

    Strip ``pgbouncer=true`` (Supabase pooler hint; psycopg/libpq reject it).
    ``search_path`` is applied on every pool checkout — URL ``options=`` is ignored by
    Supabase poolers, and transaction-mode (:6543) resets session state per transaction.
    """
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+psycopg"
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.pop("pgbouncer", None)
    query.pop("options", None)
    clean = urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), ""))
    connect_args: dict = {}
    if parts.port == 6543:
        connect_args["prepare_threshold"] = None
    return clean, connect_args


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    url, connect_args = _sync_url(settings.require_database_url())
    engine = create_engine(
        url,
        pool_pre_ping=True,
        future=True,
        connect_args=connect_args,
    )
    schema = settings.db_schema

    @event.listens_for(engine, "checkout")
    def _set_search_path(dbapi_conn, _connection_rec, _connection_proxy):  # noqa: ANN001
        if not schema:
            return
        with dbapi_conn.cursor() as cur:
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
