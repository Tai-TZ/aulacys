"""Catalog API schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Category(BaseModel):
    id: str
    name: str
    name_en: str | None = None


class ConfigHint(BaseModel):
    agents: list[str]
    gate: str
    ltv_cap: float | None = None
    term_cap: str | None = None
    ceiling_vnd: int | None = None
    graph_product: str | None = None


class Product(BaseModel):
    id: str
    name: str
    category: str
    collateral: bool
    slogan: str = ""
    features: dict[str, Any] = Field(default_factory=dict)
    graph_product: str | None = None
    in_scope: bool = True


class ProductDetail(Product):
    config_hint: ConfigHint
