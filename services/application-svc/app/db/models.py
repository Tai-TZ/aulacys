"""ORM models for application-svc — docs/APPLICATION-SCHEMA.md §2."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship

from app.db.base import Base


class LoanApplication(Base):
    __tablename__ = "loan_application"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    contract_no: Mapped[str | None] = mapped_column(Text, nullable=True)
    product: Mapped[str] = mapped_column(
        Text, nullable=False, default="retail_unsecured_salary"
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 0), nullable=False)
    term_months: Mapped[int] = mapped_column(Integer, nullable=False)
    lending_method: Mapped[str] = mapped_column(
        Text, nullable=False, default="per_loan"
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="submitted", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    applicant: Mapped[Applicant | None] = orm_relationship(
        back_populates="application", uselist=False
    )
    phone: Mapped[ApplicantPhone | None] = orm_relationship(
        back_populates="application", uselist=False
    )
    addresses: Mapped[list[ApplicantAddress]] = orm_relationship(
        back_populates="application"
    )
    employment: Mapped[Employment | None] = orm_relationship(
        back_populates="application", uselist=False
    )
    references: Mapped[list[ReferencePerson]] = orm_relationship(
        back_populates="application"
    )
    spouse: Mapped[Spouse | None] = orm_relationship(
        back_populates="application", uselist=False
    )
    financial: Mapped[FinancialCapacity | None] = orm_relationship(
        back_populates="application", uselist=False
    )
    consent: Mapped[Consent | None] = orm_relationship(
        back_populates="application", uselist=False
    )
    purposes: Mapped[list[LoanPurpose]] = orm_relationship(back_populates="application")
    disbursements: Mapped[list[Disbursement]] = orm_relationship(
        back_populates="application"
    )
    sales: Mapped[SalesInfo | None] = orm_relationship(
        back_populates="application", uselist=False
    )
    documents: Mapped[list[ApplicationDocument]] = orm_relationship(
        back_populates="application"
    )


class Applicant(Base):
    __tablename__ = "applicant"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("loan_application.id"), primary_key=True
    )
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(Text, nullable=True)
    id_number: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    id_issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    id_issue_place: Mapped[str | None] = mapped_column(Text, nullable=True)
    old_id_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)

    application: Mapped[LoanApplication] = orm_relationship(back_populates="applicant")


class ApplicantPhone(Base):
    __tablename__ = "applicant_phone"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("loan_application.id"), primary_key=True
    )
    mobile_1: Mapped[str] = mapped_column(Text, nullable=False)
    mobile_2: Mapped[str | None] = mapped_column(Text, nullable=True)
    zalo_phone: Mapped[str | None] = mapped_column(Text, nullable=True)

    application: Mapped[LoanApplication] = orm_relationship(back_populates="phone")


class ApplicantAddress(Base):
    __tablename__ = "applicant_address"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loan_application.id"),
        nullable=False,
        index=True,
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    street: Mapped[str | None] = mapped_column(Text, nullable=True)
    ward: Mapped[str | None] = mapped_column(Text, nullable=True)
    district: Mapped[str | None] = mapped_column(Text, nullable=True)
    province: Mapped[str | None] = mapped_column(Text, nullable=True)
    same_as_permanent: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=False
    )

    application: Mapped[LoanApplication] = orm_relationship(back_populates="addresses")


class Employment(Base):
    __tablename__ = "employment"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("loan_application.id"), primary_key=True
    )
    occupation: Mapped[str | None] = mapped_column(Text, nullable=True)
    employer_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_day: Mapped[str | None] = mapped_column(Text, nullable=True)

    application: Mapped[LoanApplication] = orm_relationship(back_populates="employment")


class ReferencePerson(Base):
    __tablename__ = "reference_person"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loan_application.id"),
        nullable=False,
        index=True,
    )
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    relationship: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    same_address: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=False
    )

    application: Mapped[LoanApplication] = orm_relationship(back_populates="references")


class Spouse(Base):
    __tablename__ = "spouse"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("loan_application.id"), primary_key=True
    )
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    id_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    income: Mapped[Decimal | None] = mapped_column(Numeric(18, 0), nullable=True)
    employer_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    employer_phone: Mapped[str | None] = mapped_column(Text, nullable=True)

    application: Mapped[LoanApplication] = orm_relationship(back_populates="spouse")


class FinancialCapacity(Base):
    __tablename__ = "financial_capacity"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("loan_application.id"), primary_key=True
    )
    total_income: Mapped[Decimal] = mapped_column(Numeric(18, 0), nullable=False)
    personal_expense: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 0), nullable=True
    )

    application: Mapped[LoanApplication] = orm_relationship(back_populates="financial")


class Consent(Base):
    __tablename__ = "consent"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("loan_application.id"), primary_key=True
    )
    data_processing_consent: Mapped[bool] = mapped_column(Boolean, nullable=False)
    marketing_consent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    consent_version: Mapped[str | None] = mapped_column(Text, nullable=True)
    consent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    application: Mapped[LoanApplication] = orm_relationship(back_populates="consent")


class LoanPurpose(Base):
    __tablename__ = "loan_purpose"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loan_application.id"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 0), nullable=False)
    purpose_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    prepaid_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 0), nullable=True
    )

    application: Mapped[LoanApplication] = orm_relationship(back_populates="purposes")
    goods: Mapped[list[PurposeGoods]] = orm_relationship(back_populates="purpose")


class PurposeGoods(Base):
    __tablename__ = "purpose_goods"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    purpose_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("loan_purpose.id"), nullable=False, index=True
    )
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    brand: Mapped[str | None] = mapped_column(Text, nullable=True)
    serial_imei: Mapped[str | None] = mapped_column(Text, nullable=True)
    value: Mapped[Decimal | None] = mapped_column(Numeric(18, 0), nullable=True)

    purpose: Mapped[LoanPurpose] = orm_relationship(back_populates="goods")


class Disbursement(Base):
    __tablename__ = "disbursement"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loan_application.id"),
        nullable=False,
        index=True,
    )
    for_category: Mapped[str | None] = mapped_column(Text, nullable=True)
    method: Mapped[str] = mapped_column(Text, nullable=False)
    bank: Mapped[str | None] = mapped_column(Text, nullable=True)
    branch: Mapped[str | None] = mapped_column(Text, nullable=True)
    account_no: Mapped[str | None] = mapped_column(Text, nullable=True)
    account_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    beneficiary_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    beneficiary_tax_id: Mapped[str | None] = mapped_column(Text, nullable=True)

    application: Mapped[LoanApplication] = orm_relationship(
        back_populates="disbursements"
    )


class SalesInfo(Base):
    __tablename__ = "sales_info"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("loan_application.id"), primary_key=True
    )
    dsa_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    witness_phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    branch_pos_hub: Mapped[str | None] = mapped_column(Text, nullable=True)

    application: Mapped[LoanApplication] = orm_relationship(back_populates="sales")


class ApplicationDocument(Base):
    __tablename__ = "application_document"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loan_application.id"),
        nullable=False,
        index=True,
    )
    doc_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="received")
    required_for: Mapped[str | None] = mapped_column(Text, nullable=True)
    storage_uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    tier: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confirmed_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    application: Mapped[LoanApplication] = orm_relationship(back_populates="documents")
