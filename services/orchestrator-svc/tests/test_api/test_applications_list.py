"""GET /api/v1/applications — empty when application-svc URL unset."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_list_applications_empty_without_svc(client, monkeypatch):
    monkeypatch.delenv("APPLICATION_SVC_URL", raising=False)
    res = await client.get("/api/v1/applications")
    assert res.status_code == 200
    assert res.json() == []
