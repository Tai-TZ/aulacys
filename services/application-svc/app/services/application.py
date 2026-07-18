"""Application intake business logic — consent gate; no FastAPI."""

from __future__ import annotations

import uuid
from typing import Any

from app.repositories import applications as repo
from app.schemas.application import ApplicationCreateRequest


class ConsentRequiredError(ValueError):
    """Raised when data_processing_consent is not true — hard gate before any agent."""


def init() -> None:
    repo.init_db()


def create_application(payload: ApplicationCreateRequest) -> dict[str, Any]:
    if not payload.consent.data_processing_consent:
        raise ConsentRequiredError(
            "data_processing_consent must be true — cannot process PII without consent"
        )
    return repo.create_application(payload)


def get_application(application_id: str) -> dict[str, Any] | None:
    try:
        uid = uuid.UUID(application_id)
    except ValueError:
        return None
    return repo.get_application(uid)
