"""Pull application-svc applicants and align CIC/KYC demo datasets to DB rows."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
APP_ENV = ROOT / "services" / "application-svc" / ".env"
KYC_PATH = ROOT / "packages/shared/aulacys/agents/resources/compliance/kyc_records.json"
CIC_PATH = ROOT / "services/cic-svc/seed/cic_records.json"
EKYC_PATH = ROOT / "packages/shared/aulacys/agents/resources/compliance/ekyc_face_match.json"
GEO_PATH = ROOT / "packages/shared/aulacys/agents/resources/compliance/customer_geo.json"

# Demo scenario → CIC risk profile (bureau fields keyed to DB identity).
# Numbers are tuned so SOP checks isolate the demo branch:
#   happy → clean CIC + pass DTI/disposable → STP
#   veto  → clean CIC + pass DTI; purpose_evidence alone blocks
#   hitl  → group 2 mild overdue → Credit manual_review (no blocking veto)
DEMO_CIC_PROFILE = {
    "074300004128": {  # happy — clean
        "debt_group": 1,
        "max_overdue_days": 0,
        "overdue_amount_vnd": 0,
        "overdue_count": 0,
        "num_active_loans": 1,
        "outstanding_ratio": 0.15,
        "monthly_debt_obligation_vnd": 1_500_000,
    },
    "091185013867": {  # veto purpose — CIC clean
        "debt_group": 1,
        "max_overdue_days": 0,
        "overdue_amount_vnd": 0,
        "overdue_count": 0,
        "num_active_loans": 1,
        "outstanding_ratio": 0.1,
        "monthly_debt_obligation_vnd": 0,
    },
    "054301008970": {  # hitl — mild attention group 2
        "debt_group": 2,
        "max_overdue_days": 30,
        "overdue_amount_vnd": 2_000_000,
        "overdue_count": 1,
        "num_active_loans": 1,
        "outstanding_ratio": 0.25,
        "monthly_debt_obligation_vnd": 1_500_000,
    },
}

PROVINCE_COORDS = {
    "Hà Nội": (21.0285, 105.8542),
    "Hải Phòng": (20.8449, 106.6881),
    "Đà Nẵng": (16.0544, 108.2022),
    "Phú Yên": (13.0881, 109.3220),
    "Thừa Thiên Huế": (16.4637, 107.5909),
    "Khánh Hòa": (12.2388, 109.1967),
    "Bình Định": (13.7820, 109.2197),
    "TP. Hồ Chí Minh": (10.8231, 106.6297),
    "Cần Thơ": (10.0452, 105.7469),
    "Đồng Nai": (10.9508, 106.8500),
    "Bình Dương": (11.3254, 106.4770),
    "Kiên Giang": (10.0125, 105.0809),
    "Cà Mau": (9.1769, 105.1520),
    "Bạc Liêu": (9.2940, 105.7216),
    "An Giang": (10.5216, 105.1259),
    "Đắk Lắk": (12.6667, 108.0500),
}

CREDIT_TYPE_VI = {
    "secured": "Vay có tài sản bảo đảm",
    "unsecured": "Vay tín chấp",
    "card": "Thẻ tín dụng",
}

VN_BANKS = ["SHB", "Vietcombank", "VietinBank", "BIDV", "Agribank", "Techcombank"]

DEMO_AVATARS = {
    "074300004128": "/aulacys/cccd-be-hoa.png",
    "091185013867": "/aulacys/cccd-tran-vui.png",
    "054301008970": "/aulacys/cccd-huyen-tran.png",
}


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _dump(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


async def fetch_applicants() -> list[dict]:
    load_dotenv(APP_ENV)
    raw = os.environ["DIRECT_URL"].split("?")[0]
    conn = await asyncpg.connect(raw)
    try:
        await conn.execute("SET search_path TO application")
        rows = await conn.fetch(
            """
            SELECT a.id::text AS application_id,
                   a.product,
                   a.total_amount::float AS amount,
                   a.term_months,
                   a.status,
                   ap.customer_id,
                   ap.full_name,
                   ap.id_number,
                   ap.dob::text AS dob,
                   ap.gender,
                   f.total_income::float AS income,
                   f.personal_expense::float AS expense,
                   e.occupation,
                   e.employer_name,
                   addr.province,
                   addr.street,
                   addr.ward,
                   addr.district
            FROM loan_application a
            JOIN applicant ap ON ap.application_id = a.id
            LEFT JOIN financial_capacity f ON f.application_id = a.id
            LEFT JOIN employment e ON e.application_id = a.id
            LEFT JOIN applicant_address addr
              ON addr.application_id = a.id AND addr.kind = 'permanent'
            ORDER BY ap.id_number
            """
        )
        return [dict(r) for r in rows]
    finally:
        await conn.close()


def _cic_record(row: dict, customer_id: str, profile: dict) -> dict:
    income = float(row.get("income") or 15_000_000)
    amount = float(row.get("amount") or 100_000_000)
    loans = int(profile["num_active_loans"])
    limit = max(int(income * 20), int(amount * 1.5), 50_000_000)
    outstanding = int(limit * float(profile["outstanding_ratio"]))
    if "monthly_debt_obligation_vnd" in profile:
        monthly = int(profile["monthly_debt_obligation_vnd"])
    else:
        monthly = max(int(outstanding * 0.03), int(income * 0.1))
    days = int(profile["max_overdue_days"])
    group = int(profile["debt_group"])
    types = ["unsecured", "card"] if group <= 2 else ["unsecured"]
    if row.get("product") and "mortgage" in str(row["product"]):
        types = ["secured", "unsecured"]
    n_inst = min(max(loans, 1), len(VN_BANKS))
    return {
        "customer_id": customer_id,
        "full_name": row["full_name"],
        "debt_group": group,
        "outstanding_debt": outstanding,
        "total_outstanding_vnd": outstanding,
        "overdue_history": {
            "count": int(profile["overdue_count"]),
            "max_days": days,
            "amount_vnd": int(profile["overdue_amount_vnd"]),
        },
        "number_of_institutions": n_inst,
        "institutions": VN_BANKS[:n_inst],
        "credit_limit_total_vnd": limit,
        "num_active_loans": loans,
        "monthly_debt_obligation_vnd": monthly,
        "max_overdue_days": days,
        "overdue_amount_vnd": int(profile["overdue_amount_vnd"]),
        "credit_history_months": 48,
        "credit_types": types,
        "credit_types_vi": [CREDIT_TYPE_VI.get(t, t) for t in types],
        "inquiries_last_6m": 2 if group == 1 else 4,
    }


def _default_profile(idx: int) -> dict:
    # Rotate groups 1-5 for non-demo DB rows
    group = (idx % 5) + 1
    overdue = {1: 0, 2: 30, 3: 120, 4: 240, 5: 400}[group]
    return {
        "debt_group": group,
        "max_overdue_days": overdue,
        "overdue_amount_vnd": 0 if group == 1 else group * 5_000_000,
        "overdue_count": 0 if group == 1 else group,
        "num_active_loans": min(group, 3),
        "outstanding_ratio": min(0.15 * group, 0.8),
    }


def sync_datasets(rows: list[dict]) -> None:
    kyc = _load(KYC_PATH)
    cic = _load(CIC_PATH)
    ekyc = _load(EKYC_PATH)
    geo = _load(GEO_PATH)

    # Prefer existing KYC customer_id; else DB customer_id; else allocate
    used = {v.get("customer_id") for k, v in kyc.items() if not k.startswith("_")}
    used |= {v.get("customer_id") for k, v in cic.items() if not k.startswith("_") and isinstance(v, dict)}
    next_n = 1
    for cid in list(used):
        if isinstance(cid, str) and cid.startswith("CUST-"):
            try:
                next_n = max(next_n, int(cid.split("-")[-1]) + 1)
            except ValueError:
                pass

    # Drop CIC-only synthetic keys that are not in DB (001099000094-100 etc.) later after rebuild
    db_cccds = {r["id_number"] for r in rows}

    for i, row in enumerate(rows):
        cccd = row["id_number"]
        prev_kyc = kyc.get(cccd) if isinstance(kyc.get(cccd), dict) else {}
        customer_id = (
            row.get("customer_id")
            or prev_kyc.get("customer_id")
            or (cic.get(cccd) or {}).get("customer_id")
        )
        if not customer_id:
            customer_id = f"CUST-{next_n:06d}"
            next_n += 1

        province = row.get("province") or "Việt Nam"
        street = row.get("street") or ""
        address = ", ".join(p for p in [street, row.get("ward"), row.get("district"), province] if p)

        # Demo users stay non-PEP so HITL/veto/happy branches stay isolated.
        if cccd in DEMO_CIC_PROFILE:
            pep_flag, pep_rel, risk = "N", None, "Thấp"
        else:
            pep_flag = prev_kyc.get("pep_flag") or "N"
            pep_rel = prev_kyc.get("relationship_to_pep")
            risk = prev_kyc.get("kyc_risk_level") or "Thấp"

        # KYC from DB
        kyc[cccd] = {
            "customer_id": customer_id,
            "full_name": row["full_name"],
            "id_number": cccd,
            "date_of_birth": row.get("dob") or prev_kyc.get("date_of_birth"),
            "nationality": "Việt Nam",
            "address": address or prev_kyc.get("address") or province,
            "occupation": row.get("occupation") or prev_kyc.get("occupation") or "Chưa cập nhật",
            "income_source": "Lương chuyển khoản" if row.get("employer_name") else "Thu nhập khai báo",
            "declared_income": int(row.get("income") or prev_kyc.get("declared_income") or 0),
            "customer_type": "Cá nhân",
            "business_sector": None,
            "onboarding_date": prev_kyc.get("onboarding_date") or "2024-01-01",
            "kyc_risk_level": risk,
            "pep_flag": pep_flag,
            "relationship_to_pep": pep_rel,
            "avatar": DEMO_AVATARS.get(cccd) or prev_kyc.get("avatar") or f"/aulacys/avatars/{customer_id}.jpg",
        }

        profile = DEMO_CIC_PROFILE.get(cccd) or _default_profile(i)
        cic[cccd] = _cic_record(row, customer_id, profile)

        # eKYC — keep score if present; demo users pass
        prev_ekyc = ekyc.get(cccd) if isinstance(ekyc.get(cccd), dict) else {}
        score = int(prev_ekyc.get("face_match_score") or (88 if cccd in DEMO_CIC_PROFILE else 90))
        if cccd == "054301008970":
            score = max(score, 88)  # hitl still passes face match
        ekyc[cccd] = {
            "customer_id": customer_id,
            "id_number": cccd,
            "face_match_score": score,
            "liveness_passed": score >= 85,
            "provider": "synthetic-ekyc",
            "captured_at": prev_ekyc.get("captured_at") or "2026-07-01T10:00:00+07:00",
        }

        lat_lon = PROVINCE_COORDS.get(province, (16.0, 108.0))
        geo[cccd] = {
            "customer_id": customer_id,
            "id_number": cccd,
            "province": province,
            "address": address or province,
            "lat": round(lat_lon[0], 6),
            "lon": round(lat_lon[1], 6),
        }

    # Remove CIC keys that are neither DB nor keep meta/default
    for key in list(cic.keys()):
        if key.startswith("_"):
            continue
        if key not in db_cccds and key not in kyc:
            # keep remaining KYC synthetic pool? User asked DB-linked demos.
            # Keep non-DB KYC records in KYC/eKYC/geo; for CIC only ensure DB CCCDs exist.
            # Remove CIC-only orphans (001099000094-100).
            if key.startswith("00109900009") or key == "001099000100":
                del cic[key]

    # Ensure every DB CCCD exists in CIC (already written above)
    kyc["_meta"]["version"] = "2026.3"
    kyc["_meta"]["schema_version"] = "2.1"
    kyc["_meta"]["updated_at"] = "2026-07-19"
    kyc["_meta"]["description"] = "KYC synced from application-svc DB applicants + demo avatars"
    kyc["_meta"]["record_count"] = sum(1 for k in kyc if not k.startswith("_"))

    cic["_meta"]["version"] = "2026.3"
    cic["_meta"]["schema_version"] = "2.1"
    cic["_meta"]["updated_at"] = "2026-07-19"
    cic["_meta"]["description"] = "CIC seed aligned to application-svc DB applicants (demo happy/veto/hitl)"
    cic["_meta"]["record_count"] = sum(1 for k in cic if not k.startswith("_"))

    ekyc["_meta"]["version"] = "2026.3"
    ekyc["_meta"]["record_count"] = sum(1 for k in ekyc if not k.startswith("_"))
    geo["_meta"]["version"] = "2026.3"
    geo["_meta"]["record_count"] = sum(1 for k in geo if not k.startswith("_"))

    _dump(KYC_PATH, kyc)
    _dump(CIC_PATH, cic)
    _dump(EKYC_PATH, ekyc)
    _dump(GEO_PATH, geo)

    print(f"DB applicants: {len(rows)}")
    for r in rows:
        cccd = r["id_number"]
        print(
            f"  {cccd} {r['full_name']} cust={kyc[cccd]['customer_id']} "
            f"cic_group={cic[cccd]['debt_group']} income={r.get('income')}"
        )
    print(f"CIC records now: {cic['_meta']['record_count']}")
    print(f"wrote {CIC_PATH}")


async def amain() -> None:
    rows = await fetch_applicants()
    if not rows:
        raise SystemExit("No applicants in application DB — seed dossiers first")
    sync_datasets(rows)


if __name__ == "__main__":
    asyncio.run(amain())
