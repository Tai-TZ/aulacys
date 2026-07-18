"""Catalog business logic — derive config_hint per product."""

from __future__ import annotations

from typing import Any

from app.repositories import catalog as repo


def _term_cap(features: dict[str, Any]) -> str | None:
    if features.get("term_years_max") is not None:
        return f"{features['term_years_max']}y"
    if features.get("term_months_max") is not None:
        return f"{features['term_months_max']}m"
    return None


def _config_hint(product: dict[str, Any]) -> dict[str, Any]:
    collateral = bool(product.get("collateral"))
    features = product.get("features") or {}
    ceiling = features.get("ceiling_vnd")
    if collateral:
        agents = ["credit", "operations", "compliance"]
        gate = "never"
    else:
        agents = ["credit", "compliance"]
        if ceiling:
            gate = f"all_rules_pass AND amount <= {int(ceiling)}"
        else:
            gate = "all_rules_pass"
    return {
        "agents": agents,
        "gate": gate,
        "ltv_cap": features.get("ltv_cap"),
        "term_cap": _term_cap(features),
        "ceiling_vnd": ceiling,
        "graph_product": product.get("graph_product"),
    }


def list_categories() -> list[dict[str, Any]]:
    return list(repo.load_catalog().get("categories", []))


def list_products(*, in_scope_only: bool | None = None) -> list[dict[str, Any]]:
    from app.core.config import get_settings

    only = get_settings().in_scope_only if in_scope_only is None else in_scope_only
    products = repo.load_catalog().get("products", [])
    if only:
        products = [p for p in products if p.get("in_scope", True)]
    return products


def get_product(product_id: str) -> dict[str, Any] | None:
    for p in repo.load_catalog().get("products", []):
        if p.get("id") == product_id:
            detail = dict(p)
            detail["config_hint"] = _config_hint(p)
            return detail
    return None


def product_count(*, in_scope_only: bool = True) -> int:
    return len(list_products(in_scope_only=in_scope_only))
