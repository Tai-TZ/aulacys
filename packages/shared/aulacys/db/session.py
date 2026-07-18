"""Async engine + session for Supabase Postgres.

Connection flow (why two URLs):
- DATABASE_URL -> transaction pooler, port 6543, `pgbouncer=true`. Used for all
  runtime queries. PgBouncer in *transaction* mode multiplexes connections, so
  server-side prepared statements and session state are NOT safe. We therefore:
    * disable asyncpg's statement cache (`statement_cache_size=0`), and
    * use NullPool (the pooler already pools; a second pool would fight it).
- DIRECT_URL  -> session pooler, port 5432. Used ONLY by Alembic migrations
  (DDL + advisory locks need a real session). See migrations/env.py.

Demo-proof: if DATABASE_URL is empty the whole layer is disabled and the app
keeps running in-memory. `ping()` never raises — a dead DB must not 500 the demo.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from urllib.parse import urlsplit, urlunsplit

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from aulacys.config import get_settings


def _to_asyncpg_url(url: str) -> str:
    """Normalize a Supabase/Postgres URL for SQLAlchemy's asyncpg driver.

    - `postgresql://` / `postgres://` -> `postgresql+asyncpg://`
    - drop query params (e.g. `pgbouncer=true`, `sslmode=...`) that the asyncpg
      driver does not understand; pooler behavior is handled via connect_args.
    """
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"
    # strip query + fragment
    return urlunsplit((scheme, parts.netloc, parts.path, "", ""))


_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def is_enabled() -> bool:
    return get_settings().db_enabled


def get_engine() -> AsyncEngine:
    """Lazily build the singleton async engine. Call only when is_enabled()."""
    global _engine, _sessionmaker
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            _to_asyncpg_url(settings.database_url),
            poolclass=NullPool,  # PgBouncer pools for us
            connect_args={"statement_cache_size": 0},  # required for transaction-mode pooler
            pool_pre_ping=True,
            echo=False,
        )
        _sessionmaker = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


def _get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    get_engine()  # ensures _sessionmaker is built
    assert _sessionmaker is not None
    return _sessionmaker


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: yields an AsyncSession. Use with Depends(get_db)."""
    async with _get_sessionmaker()() as session:
        yield session


async def ping() -> bool:
    """Return True if the DB answers `SELECT 1`. Never raises (demo-proof)."""
    if not is_enabled():
        return False
    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


async def dispose() -> None:
    """Close the engine's connections (call on shutdown)."""
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _sessionmaker = None
