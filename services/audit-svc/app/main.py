"""audit-svc — the immutable decision ledger as an independent microservice.

The orchestrator POSTs a decision here (ideally via a `DecisionRecorded` event, so a
slow ledger never blocks the user response). Append-only + hash chain; a dead audit
service must not break the decision path (the caller treats the write as best-effort).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router
from app.core.config import get_settings
from app.services import audit as audit_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        audit_service.init()
    except Exception:
        logger.exception("audit-svc init_db failed; starting without schema bootstrap")
    yield


settings = get_settings()
app = FastAPI(title=settings.service_name, version=settings.version, lifespan=lifespan)
app.include_router(router)
