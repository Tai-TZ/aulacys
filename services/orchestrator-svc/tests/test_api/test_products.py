"""Loan product catalog CRUD — memory fallback (no DB required)."""

from __future__ import annotations

import pytest

from aulacys.services import products as products_svc


@pytest.fixture(autouse=True)
def _reset_catalog():
    products_svc.reset_memory_for_tests()
    yield
    products_svc.reset_memory_for_tests()


@pytest.mark.asyncio
async def test_list_products_auto_seeds(client):
    res = await client.get("/api/v1/products")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 8
    assert any(p["product_code"] == "IND_HOME_01" for p in data)


@pytest.mark.asyncio
async def test_product_crud_roundtrip(client):
    groups = (await client.get("/api/v1/product-groups")).json()
    assert groups
    gid = groups[0]["id"]

    create = await client.post(
        "/api/v1/products",
        json={
            "product_group_id": gid,
            "product_code": "IND_TEST_99",
            "product_name": "San pham test",
            "loan_method": "Cho vay tra gop",
            "secured_type": "UNSECURED",
            "status": "DRAFT",
            "min_amount": 10_000_000,
            "max_amount": 100_000_000,
            "min_term": 6,
            "max_term": 36,
            "interest_rate": 9.5,
            "purpose": "Test",
            "segments": ["Cá nhân"],
        },
    )
    assert create.status_code == 201, create.text
    body = create.json()
    pid = body["id"]
    assert body["product_code"] == "IND_TEST_99"

    patched = await client.patch(f"/api/v1/products/{pid}/status", json={"status": "ACTIVE"})
    assert patched.status_code == 200
    assert patched.json()["status"] == "ACTIVE"

    updated = await client.put(
        f"/api/v1/products/{pid}",
        json={
            "product_group_id": gid,
            "product_code": "IND_TEST_99",
            "product_name": "San pham test v2",
            "status": "ACTIVE",
            "secured_type": "UNSECURED",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["product_name"] == "San pham test v2"

    deleted = await client.delete(f"/api/v1/products/{pid}")
    assert deleted.status_code == 204
    missing = await client.get(f"/api/v1/products/{pid}")
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_duplicate_product_code_conflict(client):
    await client.get("/api/v1/products")  # seed
    groups = (await client.get("/api/v1/product-groups")).json()
    res = await client.post(
        "/api/v1/products",
        json={
            "product_group_id": groups[0]["id"],
            "product_code": "IND_HOME_01",
            "product_name": "Dup",
            "status": "DRAFT",
        },
    )
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_group_delete_blocked_when_products(client):
    await client.get("/api/v1/products")
    res = await client.delete("/api/v1/product-groups/vay-nha")
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_seed_endpoint(client):
    res = await client.post("/api/v1/products/seed")
    assert res.status_code == 200
    data = res.json()
    assert data["products_upserted"] >= 1
    assert data["source"] in {"memory", "database"}
