"""Tests for catalog-svc scope filter + config_hint."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services import catalog as catalog_service

client = TestClient(app)


def test_in_scope_product_count() -> None:
    assert catalog_service.product_count(in_scope_only=True) == 8


def test_list_products_excludes_sme() -> None:
    ids = {p["id"] for p in catalog_service.list_products()}
    assert "loan-6" not in ids
    assert "loan-1" in ids
    assert "loan-unsecured-term" in ids


def test_config_hint_mortgage() -> None:
    detail = catalog_service.get_product("loan-1")
    assert detail is not None
    hint = detail["config_hint"]
    assert hint["agents"] == ["credit", "operations", "compliance"]
    assert hint["gate"] == "never"
    assert hint["ltv_cap"] == 0.9
    assert hint["graph_product"] == "loan-1"


def test_config_hint_unsecured() -> None:
    detail = catalog_service.get_product("loan-unsecured-term")
    assert detail is not None
    hint = detail["config_hint"]
    assert hint["agents"] == ["credit", "compliance"]
    assert "500000000" in hint["gate"]
    assert hint["graph_product"] == "loan-unsecured-term"


def test_routes() -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["product_count"] == 8

    cats = client.get("/categories")
    assert len(cats.json()["categories"]) == 5

    products = client.get("/products")
    assert len(products.json()["products"]) == 8

    one = client.get("/products/loan-1")
    assert one.status_code == 200
    assert "config_hint" in one.json()

    missing = client.get("/products/loan-6")
    assert missing.status_code == 404
