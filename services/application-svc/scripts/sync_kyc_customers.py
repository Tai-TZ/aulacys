"""Link application applicants to the versioned KYC customer profile dataset.

The application database is authoritative for existing dossier identity/contact facts.
Missing KYC profiles replace unused synthetic fixtures so the dataset remains exactly
100 records. The script is idempotent by ``id_number``.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session

SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
KYC_PATH = (
    REPO_ROOT / "packages/shared/aulacys/agents/resources/compliance/kyc_records.json"
)
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.db.engine import get_engine, reset_engine_cache  # noqa: E402


def _prefer_direct_url() -> None:
    get_settings.cache_clear()
    settings = get_settings()
    raw = settings.direct_url or settings.database_url
    if not raw:
        raise SystemExit("Set DIRECT_URL or DATABASE_URL in .env")
    url = make_url(raw)
    query = {key: value for key, value in dict(url.query).items() if key != "pgbouncer"}
    query.setdefault("options", f"-csearch_path={settings.db_schema}")
    os.environ["DATABASE_URL"] = url.set(
        drivername="postgresql+psycopg",
        query=query,
    ).render_as_string(hide_password=False)
    get_settings.cache_clear()
    reset_engine_cache()


def _load_profiles() -> dict:
    return json.loads(KYC_PATH.read_text(encoding="utf-8"))


def _applicants(session: Session) -> list[dict]:
    rows = session.execute(
        text(
            """
            SELECT a.application_id, a.customer_id, a.full_name, a.dob, a.id_number,
                   la.created_at, e.occupation, e.employer_name, f.total_income,
                   (
                     SELECT concat_ws(', ', ad.street, ad.ward, ad.district, ad.province)
                     FROM applicant_address ad
                     WHERE ad.application_id = a.application_id
                     ORDER BY CASE WHEN ad.kind = 'permanent' THEN 0 ELSE 1 END
                     LIMIT 1
                   ) AS address
            FROM applicant a
            JOIN loan_application la ON la.id = a.application_id
            LEFT JOIN employment e ON e.application_id = a.application_id
            LEFT JOIN financial_capacity f ON f.application_id = a.application_id
            ORDER BY la.created_at, a.application_id
            """
        )
    ).mappings()
    return [dict(row) for row in rows]


def _profile(row: dict, customer_id: str, previous: dict | None) -> dict:
    risk = (previous or {}).get("kyc_risk_level", "Thấp")
    pep_flag = (previous or {}).get("pep_flag", "N")
    relationship = (previous or {}).get("relationship_to_pep")
    avatar = (previous or {}).get("avatar") or f"/aulacys/avatars/{customer_id}.jpg"
    return {
        "customer_id": customer_id,
        "full_name": row["full_name"],
        "id_number": row["id_number"],
        "date_of_birth": row["dob"].isoformat() if row["dob"] else None,
        "nationality": "Việt Nam",
        "address": row["address"] or "Chưa cập nhật",
        "occupation": row["occupation"] or "Chưa cập nhật",
        "income_source": "Lương" if row["employer_name"] else "Thu nhập khai báo",
        "declared_income": int(row["total_income"] or 0),
        "customer_type": "Cá nhân",
        "business_sector": None,
        "onboarding_date": row["created_at"].date().isoformat(),
        "kyc_risk_level": risk,
        "pep_flag": pep_flag,
        "relationship_to_pep": relationship,
        "avatar": avatar,
    }


def main() -> int:
    _prefer_direct_url()
    dataset = _load_profiles()
    meta = dataset["_meta"]
    profiles = {key: value for key, value in dataset.items() if not key.startswith("_")}
    engine = get_engine()

    with Session(engine) as session:
        applicants = _applicants(session)
        db_ids = {row["id_number"] for row in applicants}
        donors = sorted((key for key in profiles if key not in db_ids), reverse=True)
        linked: list[tuple[str, str]] = []

        for row in applicants:
            id_number = row["id_number"]
            previous = profiles.get(id_number)
            if previous:
                customer_id = previous["customer_id"]
            else:
                if not donors:
                    raise RuntimeError(
                        "No unused KYC fixture available for database applicant"
                    )
                donor_key = donors.pop(0)
                customer_id = profiles.pop(donor_key)["customer_id"]
            profiles[id_number] = _profile(row, customer_id, previous)
            session.execute(
                text(
                    "UPDATE applicant SET customer_id = :customer_id WHERE application_id = :application_id"
                ),
                {"customer_id": customer_id, "application_id": row["application_id"]},
            )
            linked.append((id_number, customer_id))

        if len(profiles) != 100:
            raise RuntimeError(
                f"KYC dataset must remain at 100 records, got {len(profiles)}"
            )
        customer_ids = [profile["customer_id"] for profile in profiles.values()]
        if len(customer_ids) != len(set(customer_ids)):
            raise RuntimeError("KYC customer_id values must be unique")

        rendered = {"_meta": {**meta, "record_count": 100}, **profiles}
        temporary = KYC_PATH.with_suffix(".json.tmp")
        temporary.write_text(
            json.dumps(rendered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        session.commit()
        os.replace(temporary, KYC_PATH)

    print(f"linked={len(linked)} dataset_records={len(profiles)}")
    for id_number, customer_id in linked:
        print(f"{id_number} -> {customer_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
