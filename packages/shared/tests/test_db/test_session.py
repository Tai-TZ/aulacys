import pytest

from aulacys.config import get_settings
from aulacys.db import session


def test_url_normalization_strips_pgbouncer():
    got = session._to_asyncpg_url("postgresql://u:p@h:6543/postgres?pgbouncer=true")
    assert got == "postgresql+asyncpg://u:p@h:6543/postgres"


def test_url_normalization_postgres_scheme():
    got = session._to_asyncpg_url("postgres://u:p@h:5432/postgres")
    assert got == "postgresql+asyncpg://u:p@h:5432/postgres"


def test_disabled_by_default(monkeypatch):
    # No DATABASE_URL in test env -> DB layer disabled (in-memory fallback).
    monkeypatch.setenv("DATABASE_URL", "")
    get_settings.cache_clear()
    try:
        assert session.is_enabled() is False
    finally:
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_ping_never_raises_when_disabled(monkeypatch):
    # Demo-proof: a missing/dead DB must not raise.
    monkeypatch.setenv("DATABASE_URL", "")
    get_settings.cache_clear()
    try:
        assert await session.ping() is False
    finally:
        get_settings.cache_clear()


def test_db_enabled_reflects_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@h:6543/postgres?pgbouncer=true")
    get_settings.cache_clear()
    try:
        assert session.is_enabled() is True
    finally:
        get_settings.cache_clear()  # restore for other tests


@pytest.mark.asyncio
async def test_health_reports_db_disabled(client, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")
    get_settings.cache_clear()
    try:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["db"] == "disabled"
    finally:
        get_settings.cache_clear()
