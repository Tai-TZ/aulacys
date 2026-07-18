"""los-svc — Loan Origination System (system of record) as its own service.

The monolith's workflow tool POSTs the approval ticket here. This is the "concrete
action" the brief emphasizes — a real write into a banking workflow system, not text.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.core.config import get_settings
from app.services import los as los_service


@asynccontextmanager
async def lifespan(_app: FastAPI):
    los_service.init()
    yield


settings = get_settings()
app = FastAPI(title=settings.service_name, version=settings.version, lifespan=lifespan)
app.include_router(router)
