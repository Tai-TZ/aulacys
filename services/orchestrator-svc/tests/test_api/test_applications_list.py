"""GET /api/v1/applications — seeded fallback when application-svc is unreachable."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_list_applications_fallback_when_svc_unreachable(client, monkeypatch):
    monkeypatch.setattr(
        "app.api.routes.applications_proxy.list_applications",
        lambda **_kwargs: None,
    )
    res = await client.get("/api/v1/applications")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 3
    assert data[0]["source"] == "seeded-fallback"
    assert data[0]["applicant"]["full_name"]


@pytest.mark.asyncio
async def test_list_applications_ok(client, monkeypatch):
    monkeypatch.setattr(
        "app.api.routes.applications_proxy.list_applications",
        lambda **_kwargs: [{"id": "a1", "product": "retail_unsecured_salary"}],
    )
    res = await client.get("/api/v1/applications")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == "a1"
