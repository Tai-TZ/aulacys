"""Idempotent seed: demo + CCCD dossiers → application schema.

Usage (from services/application-svc):
  python scripts/seed_dossiers.py
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Allow `python scripts/seed_dossiers.py` from svc root or scripts/
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.engine import get_engine, reset_engine_cache
from app.db.models import Applicant, ApplicationDocument
from app.schemas.application import ApplicationCreateRequest
from app.services import application as app_service
from seed.dossiers import SEED_DOSSIERS


def _prefer_direct_url() -> None:
    """Use DIRECT_URL for seed (session pooler); strip Prisma pgbouncer query flag."""
    get_settings.cache_clear()
    settings = get_settings()
    raw = settings.direct_url or settings.database_url
    if not raw:
        raise SystemExit("Set DIRECT_URL or DATABASE_URL in .env")
    url = make_url(raw)
    query = {k: v for k, v in dict(url.query).items() if k != "pgbouncer"}
    if "options" not in query:
        query["options"] = f"-csearch_path={settings.db_schema}"
    rendered = url.set(drivername="postgresql+psycopg", query=query).render_as_string(
        hide_password=False
    )
    os.environ["DATABASE_URL"] = rendered
    get_settings.cache_clear()
    reset_engine_cache()


def _existing_id_numbers(session: Session) -> set[str]:
    rows = session.scalars(select(Applicant.id_number)).all()
    return set(rows)


def _to_create_payload(raw: dict) -> ApplicationCreateRequest:
    body = {k: v for k, v in raw.items() if k not in ("scenario", "documents")}
    return ApplicationCreateRequest.model_validate(body)


def _attach_documents(session: Session, application_id: uuid.UUID, docs: list[dict]) -> None:
    now = datetime.now(timezone.utc)
    for doc in docs:
        session.add(
            ApplicationDocument(
                id=uuid.uuid4(),
                application_id=application_id,
                doc_type=doc["doc_type"],
                title=doc.get("title"),
                status=doc.get("status", "uploaded"),
                required_for=doc.get("required_for"),
                tier=doc.get("tier"),
                uploaded_at=now if doc.get("status") in {"uploaded", "verified"} else None,
                created_at=now,
            )
        )


def main() -> int:
    _prefer_direct_url()
    app_service.init()
    engine = get_engine()

    created = 0
    skipped = 0
    with Session(engine) as session:
        existing = _existing_id_numbers(session)

    for raw in SEED_DOSSIERS:
        id_number = raw["applicant"]["id_number"]
        name = raw["applicant"]["full_name"]
        scenario = raw["scenario"]
        if id_number in existing:
            _log(f"skip  {scenario:28} {id_number}")
            skipped += 1
            continue
        payload = _to_create_payload(raw)
        result = app_service.create_application(payload)
        app_id = uuid.UUID(result["id"])
        with Session(engine) as session:
            _attach_documents(session, app_id, raw.get("documents") or [])
            session.commit()
        _log(f"ok    {scenario:28} {id_number} -> {result['id']}")
        created += 1
        existing.add(id_number)

    with Session(engine) as session:
        total = session.execute(text("SELECT count(1) FROM loan_application")).scalar()
    _log(f"done  created={created} skipped={skipped} total_loan_application={total}")
    return 0


def _log(msg: str) -> None:
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"))


if __name__ == "__main__":
    raise SystemExit(main())
