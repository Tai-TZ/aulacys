"""HTTP layer for catalog-svc."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services import catalog as catalog_service

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "product_count": catalog_service.product_count(in_scope_only=True),
    }


@router.get("/categories")
def categories() -> dict:
    return {"categories": catalog_service.list_categories()}


@router.get("/products")
def products() -> dict:
    return {"products": catalog_service.list_products()}


@router.get("/products/{product_id}")
def product_detail(product_id: str) -> dict:
    detail = catalog_service.get_product(product_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"product not found: {product_id}")
    if not detail.get("in_scope", True):
        raise HTTPException(status_code=404, detail=f"product out of scope: {product_id}")
    return detail
