"""api-gateway - demo front door and service monitor.

The gateway owns no business logic. It proxies assessment requests to the
monolith and reports health for each extracted service, returning degraded
status instead of crashing when a service is down.
"""

from __future__ import annotations

import json
import os
import time
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="api-gateway", version="0.1.0")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass(frozen=True)
class ServiceSpec:
    name: str
    env_var: str
    default_url: str
    health_path: str = "/health"
    critical: bool = False


class AssessRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)


SERVICES = [
    ServiceSpec("monolith", "MONOLITH_URL", "http://127.0.0.1:8000", critical=True),
    ServiceSpec("policy-svc", "POLICY_SVC_URL", "http://127.0.0.1:8100"),
    ServiceSpec("audit-svc", "AUDIT_SVC_URL", "http://127.0.0.1:8200"),
    ServiceSpec("cic-svc", "CIC_SVC_URL", "http://127.0.0.1:8300"),
    ServiceSpec("los-svc", "LOS_SVC_URL", "http://127.0.0.1:8310"),
    ServiceSpec("aml-svc", "AML_SVC_URL", "http://127.0.0.1:8320"),
    ServiceSpec("property-svc", "PROPERTY_SVC_URL", "http://127.0.0.1:8330"),
    ServiceSpec("income-svc", "INCOME_SVC_URL", "http://127.0.0.1:8340"),
    ServiceSpec("catalog-svc", "CATALOG_SVC_URL", "http://127.0.0.1:8350"),
    ServiceSpec("credit-svc", "CREDIT_AGENT_URL", "http://127.0.0.1:8401"),
    ServiceSpec("operations-svc", "OPERATIONS_AGENT_URL", "http://127.0.0.1:8402"),
    ServiceSpec("compliance-svc", "COMPLIANCE_AGENT_URL", "http://127.0.0.1:8403"),
    ServiceSpec("critic-svc", "CRITIC_AGENT_URL", "http://127.0.0.1:8404"),
]

_CATALOG = ServiceSpec("catalog-svc", "CATALOG_SVC_URL", "http://127.0.0.1:8350")


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _base_url(spec: ServiceSpec) -> str:
    return os.getenv(spec.env_var, spec.default_url).rstrip("/")


def _read_json(req: urllib.request.Request, timeout: int) -> dict[str, Any]:
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
        return json.loads(resp.read().decode("utf-8"))


def _get_json(url: str, timeout: int = 2) -> dict[str, Any]:
    return _read_json(urllib.request.Request(url), timeout)


def _post_json(url: str, payload: dict[str, Any], timeout: int = 30) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    return _read_json(req, timeout)


def _check_service(spec: ServiceSpec) -> dict[str, Any]:
    base_url = _base_url(spec)
    started = time.perf_counter()
    try:
        detail = _get_json(f"{base_url}{spec.health_path}")
        latency_ms = round((time.perf_counter() - started) * 1000)
        return {
            "name": spec.name,
            "url": base_url,
            "status": "up",
            "latency_ms": latency_ms,
            "critical": spec.critical,
            "detail": detail,
            "error": None,
        }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - started) * 1000)
        return {
            "name": spec.name,
            "url": base_url,
            "status": "down",
            "latency_ms": latency_ms,
            "critical": spec.critical,
            "detail": {},
            "error": str(exc),
        }


def _status_payload() -> dict[str, Any]:
    services = [
        {
            "name": "api-gateway",
            "url": "self",
            "status": "up",
            "latency_ms": 0,
            "critical": True,
            "detail": {"status": "ok"},
            "error": None,
        },
        *[_check_service(spec) for spec in SERVICES],
    ]
    up = sum(1 for item in services if item["status"] == "up")
    down = len(services) - up
    return {
        "status": "ok" if down == 0 else "degraded",
        "checked_at": _now(),
        "summary": {"total": len(services), "up": up, "down": down},
        "services": services,
    }


def _fallback_assess(message: str, error: str) -> dict[str, Any]:
    return {
        "response": "Gateway could not reach the orchestrator. The demo remains in fallback mode.",
        "outcome": "gateway_unavailable",
        "run_trace": {
            "total_cost": 0,
            "lane": 0,
            "replan_count": 0,
            "veto_fired": False,
        },
        "credit": None,
        "operations": None,
        "compliance": None,
        "trace": [
            {
                "node": "api-gateway",
                "model": "network-fallback",
                "tokens_in": 0,
                "tokens_out": 0,
                "cost": 0,
                "latency_ms": 0,
                "cache_hit": False,
                "tool_calls": ["gateway_proxy_assess"],
                "schema_retries": 0,
                "fallback_fired": True,
            }
        ],
        "ticket": None,
        "audit": None,
        "gateway": {"message": message, "error": error, "checked_at": _now()},
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/status")
def status() -> dict[str, Any]:
    return _status_payload()


@app.get("/api/v1/status")
def api_status() -> dict[str, Any]:
    return _status_payload()


@app.post("/assess")
def assess(request: AssessRequest) -> dict[str, Any]:
    try:
        return _post_json(
            f"{_base_url(SERVICES[0])}/api/v1/assess", request.model_dump()
        )
    except Exception as exc:
        return _fallback_assess(request.message, str(exc))


@app.post("/api/v1/assess")
def api_assess(request: AssessRequest) -> dict[str, Any]:
    return assess(request)


def _catalog_fallback(error: str) -> dict[str, Any]:
    return {
        "products": [],
        "categories": [],
        "gateway": {"error": error, "checked_at": _now()},
        "degraded": True,
    }


@app.get("/catalog")
def catalog() -> dict[str, Any]:
    """Proxy in-scope product list from catalog-svc (degraded empty list if down)."""
    try:
        return _get_json(f"{_base_url(_CATALOG)}/products", timeout=3)
    except Exception as exc:
        return _catalog_fallback(str(exc))


@app.get("/catalog/categories")
def catalog_categories() -> dict[str, Any]:
    try:
        return _get_json(f"{_base_url(_CATALOG)}/categories", timeout=3)
    except Exception as exc:
        return _catalog_fallback(str(exc))


@app.get("/catalog/products/{product_id}")
def catalog_product(product_id: str) -> dict[str, Any]:
    try:
        return _get_json(f"{_base_url(_CATALOG)}/products/{product_id}", timeout=3)
    except Exception as exc:
        return {**_catalog_fallback(str(exc)), "id": product_id}
