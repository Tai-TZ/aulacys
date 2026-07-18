"""catalog-svc — SHB retail product catalog for the picker + config hints."""

from __future__ import annotations

from fastapi import FastAPI

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.service_name, version=settings.version)
app.include_router(router)
