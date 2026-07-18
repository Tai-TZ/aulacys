"""One-shot: move loan dossiers from public.* → application.* (seed wrote to public)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.engine import get_engine, reset_engine_cache
from scripts.seed_dossiers import _prefer_direct_url

# Parent → child insert order
INSERT_ORDER = [
    "loan_application",
    "applicant",
    "applicant_phone",
    "applicant_address",
    "employment",
    "reference_person",
    "spouse",
    "financial_capacity",
    "consent",
    "sales_info",
    "disbursement",
    "loan_purpose",
    "purpose_goods",
    "application_document",
]


def main() -> int:
    _prefer_direct_url()
    reset_engine_cache()
    engine = get_engine()

    with Session(engine) as session:
        session.execute(text("SET search_path TO application, public"))
        pub = session.execute(text("SELECT count(1) FROM public.loan_application")).scalar()
        app = session.execute(text("SELECT count(1) FROM application.loan_application")).scalar()
        print(f"before public={pub} application={app}")
        if not pub:
            print("nothing in public — done")
            return 0
        if app and app > 0:
            print("application already has rows — skip migrate (delete public manually if needed)")
            return 0

        for table in INSERT_ORDER:
            exists = session.execute(
                text(
                    "SELECT 1 FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_name = :t"
                ),
                {"t": table},
            ).scalar()
            if not exists:
                print(f"skip missing public.{table}")
                continue
            session.execute(
                text(f"INSERT INTO application.{table} SELECT * FROM public.{table}")
            )
            print(f"copied public.{table} → application.{table}")

        for table in reversed(INSERT_ORDER):
            exists = session.execute(
                text(
                    "SELECT 1 FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_name = :t"
                ),
                {"t": table},
            ).scalar()
            if not exists:
                continue
            session.execute(text(f"DELETE FROM public.{table}"))
            print(f"cleared public.{table}")

        session.commit()
        app2 = session.execute(text("SELECT count(1) FROM application.loan_application")).scalar()
        print(f"after application.loan_application={app2}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
