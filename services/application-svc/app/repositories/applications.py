"""Application intake persistence — Postgres only."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.db.base import Base
from app.db.engine import get_engine
from app.db.models import (
    Applicant,
    ApplicantAddress,
    ApplicantPhone,
    Consent,
    Disbursement,
    Employment,
    FinancialCapacity,
    LoanApplication,
    LoanPurpose,
    PurposeGoods,
    ReferencePerson,
    SalesInfo,
    Spouse,
)
from app.schemas.application import ApplicationCreateRequest


def init_db() -> None:
    Base.metadata.create_all(get_engine())


def _truncate_all() -> None:
    engine = get_engine()
    with Session(engine) as session:
        for table in (
            "application_document",
            "purpose_goods",
            "loan_purpose",
            "disbursement",
            "sales_info",
            "consent",
            "financial_capacity",
            "spouse",
            "reference_person",
            "employment",
            "applicant_address",
            "applicant_phone",
            "applicant",
            "loan_application",
        ):
            session.execute(text(f"DELETE FROM {table}"))
        session.commit()


def create_application(payload: ApplicationCreateRequest) -> dict[str, Any]:
    engine = get_engine()
    app_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    submitted = now if payload.status == "submitted" else None

    with Session(engine) as session:
        row = LoanApplication(
            id=app_id,
            contract_no=payload.contract_no,
            product=payload.product,
            total_amount=payload.total_amount,
            term_months=payload.term_months,
            lending_method=payload.lending_method,
            status=payload.status,
            created_at=now,
            submitted_at=submitted,
        )
        session.add(row)

        a = payload.applicant
        session.add(
            Applicant(
                application_id=app_id,
                customer_id=a.customer_id,
                full_name=a.full_name,
                dob=a.dob,
                gender=a.gender,
                id_number=a.id_number,
                id_issue_date=a.id_issue_date,
                id_issue_place=a.id_issue_place,
                old_id_number=a.old_id_number,
                email=a.email,
            )
        )
        session.add(
            ApplicantPhone(
                application_id=app_id,
                mobile_1=payload.phone.mobile_1,
                mobile_2=payload.phone.mobile_2,
                zalo_phone=payload.phone.zalo_phone,
            )
        )
        for addr in payload.addresses:
            session.add(
                ApplicantAddress(
                    id=uuid.uuid4(),
                    application_id=app_id,
                    kind=addr.kind,
                    street=addr.street,
                    ward=addr.ward,
                    district=addr.district,
                    province=addr.province,
                    same_as_permanent=addr.same_as_permanent,
                )
            )
        if payload.employment:
            e = payload.employment
            session.add(
                Employment(
                    application_id=app_id,
                    occupation=e.occupation,
                    employer_name=e.employer_name,
                    position=e.position,
                    work_address=e.work_address,
                    salary_day=e.salary_day,
                )
            )
        for ref in payload.references:
            session.add(
                ReferencePerson(
                    id=uuid.uuid4(),
                    application_id=app_id,
                    seq=ref.seq,
                    full_name=ref.full_name,
                    relationship=ref.relationship,
                    phone=ref.phone,
                    same_address=ref.same_address,
                )
            )
        if payload.spouse:
            s = payload.spouse
            session.add(
                Spouse(
                    application_id=app_id,
                    full_name=s.full_name,
                    phone=s.phone,
                    id_number=s.id_number,
                    income=s.income,
                    employer_name=s.employer_name,
                    employer_phone=s.employer_phone,
                )
            )
        session.add(
            FinancialCapacity(
                application_id=app_id,
                total_income=payload.financial.total_income,
                personal_expense=payload.financial.personal_expense,
            )
        )
        session.add(
            Consent(
                application_id=app_id,
                data_processing_consent=payload.consent.data_processing_consent,
                marketing_consent=payload.consent.marketing_consent,
                consent_version=payload.consent.consent_version,
                consent_at=now,
            )
        )
        for purpose in payload.purposes:
            purpose_id = uuid.uuid4()
            session.add(
                LoanPurpose(
                    id=purpose_id,
                    application_id=app_id,
                    category=purpose.category,
                    amount=purpose.amount,
                    purpose_detail=purpose.purpose_detail,
                    prepaid_amount=purpose.prepaid_amount,
                )
            )
            for g in purpose.goods:
                session.add(
                    PurposeGoods(
                        id=uuid.uuid4(),
                        purpose_id=purpose_id,
                        seq=g.seq,
                        name=g.name,
                        brand=g.brand,
                        serial_imei=g.serial_imei,
                        value=g.value,
                    )
                )
        for d in payload.disbursements:
            session.add(
                Disbursement(
                    id=uuid.uuid4(),
                    application_id=app_id,
                    for_category=d.for_category,
                    method=d.method,
                    bank=d.bank,
                    branch=d.branch,
                    account_no=d.account_no,
                    account_name=d.account_name,
                    beneficiary_name=d.beneficiary_name,
                    beneficiary_tax_id=d.beneficiary_tax_id,
                )
            )
        if payload.sales:
            sales = payload.sales
            session.add(
                SalesInfo(
                    application_id=app_id,
                    dsa_code=sales.dsa_code,
                    witness_phone=sales.witness_phone,
                    branch_pos_hub=sales.branch_pos_hub,
                )
            )
        session.commit()

    return {
        "id": str(app_id),
        "product": payload.product,
        "status": payload.status,
        "total_amount": str(payload.total_amount),
        "term_months": payload.term_months,
        "submitted_at": submitted.isoformat() if submitted else None,
        "source": "application-svc",
    }


def _dec(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def get_application(application_id: uuid.UUID) -> dict[str, Any] | None:
    with Session(get_engine()) as session:
        row = session.scalars(
            select(LoanApplication)
            .where(LoanApplication.id == application_id)
            .options(
                selectinload(LoanApplication.applicant),
                selectinload(LoanApplication.phone),
                selectinload(LoanApplication.addresses),
                selectinload(LoanApplication.employment),
                selectinload(LoanApplication.references),
                selectinload(LoanApplication.spouse),
                selectinload(LoanApplication.financial),
                selectinload(LoanApplication.consent),
                selectinload(LoanApplication.purposes).selectinload(LoanPurpose.goods),
                selectinload(LoanApplication.disbursements),
                selectinload(LoanApplication.sales),
            )
        ).first()
        if row is None:
            return None
        return _serialize(row)


def list_applications(*, limit: int = 100) -> list[dict[str, Any]]:
    """Newest first — full Section A payload (admin dossier list + detail)."""
    with Session(get_engine()) as session:
        rows = session.scalars(
            select(LoanApplication)
            .options(
                selectinload(LoanApplication.applicant),
                selectinload(LoanApplication.phone),
                selectinload(LoanApplication.addresses),
                selectinload(LoanApplication.employment),
                selectinload(LoanApplication.references),
                selectinload(LoanApplication.spouse),
                selectinload(LoanApplication.financial),
                selectinload(LoanApplication.consent),
                selectinload(LoanApplication.purposes).selectinload(LoanPurpose.goods),
                selectinload(LoanApplication.disbursements),
                selectinload(LoanApplication.sales),
            )
            .order_by(LoanApplication.created_at.desc())
            .limit(max(1, min(limit, 500)))
        ).all()
        return [_serialize(row) for row in rows]


def _serialize(row: LoanApplication) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "contract_no": row.contract_no,
        "product": row.product,
        "total_amount": _dec(row.total_amount),
        "term_months": row.term_months,
        "lending_method": row.lending_method,
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "submitted_at": row.submitted_at.isoformat() if row.submitted_at else None,
        "applicant": None
        if row.applicant is None
        else {
            "customer_id": row.applicant.customer_id,
            "full_name": row.applicant.full_name,
            "dob": row.applicant.dob.isoformat() if row.applicant.dob else None,
            "gender": row.applicant.gender,
            "id_number": row.applicant.id_number,
            "id_issue_date": row.applicant.id_issue_date.isoformat()
            if row.applicant.id_issue_date
            else None,
            "id_issue_place": row.applicant.id_issue_place,
            "old_id_number": row.applicant.old_id_number,
            "email": row.applicant.email,
        },
        "phone": None
        if row.phone is None
        else {
            "mobile_1": row.phone.mobile_1,
            "mobile_2": row.phone.mobile_2,
            "zalo_phone": row.phone.zalo_phone,
        },
        "addresses": [
            {
                "id": str(a.id),
                "kind": a.kind,
                "street": a.street,
                "ward": a.ward,
                "district": a.district,
                "province": a.province,
                "same_as_permanent": a.same_as_permanent,
            }
            for a in row.addresses
        ],
        "employment": None
        if row.employment is None
        else {
            "occupation": row.employment.occupation,
            "employer_name": row.employment.employer_name,
            "position": row.employment.position,
            "work_address": row.employment.work_address,
            "salary_day": row.employment.salary_day,
        },
        "references": [
            {
                "id": str(r.id),
                "seq": r.seq,
                "full_name": r.full_name,
                "relationship": r.relationship,
                "phone": r.phone,
                "same_address": r.same_address,
            }
            for r in sorted(row.references, key=lambda x: x.seq)
        ],
        "spouse": None
        if row.spouse is None
        else {
            "full_name": row.spouse.full_name,
            "phone": row.spouse.phone,
            "id_number": row.spouse.id_number,
            "income": _dec(row.spouse.income),
            "employer_name": row.spouse.employer_name,
            "employer_phone": row.spouse.employer_phone,
        },
        "financial": None
        if row.financial is None
        else {
            "total_income": _dec(row.financial.total_income),
            "personal_expense": _dec(row.financial.personal_expense),
        },
        "consent": None
        if row.consent is None
        else {
            "data_processing_consent": row.consent.data_processing_consent,
            "marketing_consent": row.consent.marketing_consent,
            "consent_version": row.consent.consent_version,
            "consent_at": row.consent.consent_at.isoformat()
            if row.consent.consent_at
            else None,
        },
        "purposes": [
            {
                "id": str(p.id),
                "category": p.category,
                "amount": _dec(p.amount),
                "purpose_detail": p.purpose_detail,
                "prepaid_amount": _dec(p.prepaid_amount),
                "goods": [
                    {
                        "id": str(g.id),
                        "seq": g.seq,
                        "name": g.name,
                        "brand": g.brand,
                        "serial_imei": g.serial_imei,
                        "value": _dec(g.value),
                    }
                    for g in sorted(p.goods, key=lambda x: x.seq)
                ],
            }
            for p in row.purposes
        ],
        "disbursements": [
            {
                "id": str(d.id),
                "for_category": d.for_category,
                "method": d.method,
                "bank": d.bank,
                "branch": d.branch,
                "account_no": d.account_no,
                "account_name": d.account_name,
                "beneficiary_name": d.beneficiary_name,
                "beneficiary_tax_id": d.beneficiary_tax_id,
            }
            for d in row.disbursements
        ],
        "sales": None
        if row.sales is None
        else {
            "dsa_code": row.sales.dsa_code,
            "witness_phone": row.sales.witness_phone,
            "branch_pos_hub": row.sales.branch_pos_hub,
        },
        "source": "application-svc",
    }
