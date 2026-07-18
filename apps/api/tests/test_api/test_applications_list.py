"""GET /api/v1/applications — 503 when application-svc unreachable."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_list_applications_503_when_svc_unreachable(client, monkeypatch):
    monkeypatch.setattr(
        "src.api.routes.applications_proxy.list_applications",
        lambda **_kwargs: None,
    )
    res = await client.get("/api/v1/applications")
    assert res.status_code == 503
    assert "unreachable" in res.json()["detail"]


@pytest.mark.asyncio
async def test_list_applications_ok(client, monkeypatch):
    monkeypatch.setattr(
        "src.api.routes.applications_proxy.list_applications",
        lambda **_kwargs: [{"id": "a1", "product": "retail_unsecured_salary"}],
    )
    res = await client.get("/api/v1/applications")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == "a1"
