"""application-svc — loan application intake (SHBFinance Section A).

Owns schema `application`. Consent is a hard gate: data_processing_consent must
be true before persist. Orchestrator will later load by id instead of seed_application.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.services import application as app_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Demo-proof: a DB blip must not prevent the process from listening on PORT.
    try:
        app_service.init()
    except Exception:
        logger.exception("application-svc init_db failed; starting without schema bootstrap")
    yield


settings = get_settings()
app = FastAPI(title=settings.service_name, version=settings.version, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
