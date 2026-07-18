import pytest

from aulacys.config import get_settings


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
