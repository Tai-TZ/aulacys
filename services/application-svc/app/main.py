"""application-svc — loan application intake (SHBFinance Section A).

Owns schema `application`. Consent is a hard gate: data_processing_consent must
be true before persist. Orchestrator will later load by id instead of seed_application.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.core.config import get_settings
from app.services import application as app_service


@asynccontextmanager
async def lifespan(_app: FastAPI):
    app_service.init()
    yield


settings = get_settings()
app = FastAPI(title=settings.service_name, version=settings.version, lifespan=lifespan)
app.include_router(router)
