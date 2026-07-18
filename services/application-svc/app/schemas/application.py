"""Pydantic intake models — SHBFinance Section A (docs/APPLICATION-SCHEMA.md)."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ApplicantIn(BaseModel):
    customer_id: str | None = None
    full_name: str
    dob: date | None = None
    gender: str | None = None
    id_number: str
    id_issue_date: date | None = None
    id_issue_place: str | None = None
    old_id_number: str | None = None
    email: str | None = None


class ApplicantPhoneIn(BaseModel):
    mobile_1: str
    mobile_2: str | None = None
    zalo_phone: str | None = None


class ApplicantAddressIn(BaseModel):
    kind: str  # current | permanent
    street: str | None = None
    ward: str | None = None
    district: str | None = None
    province: str | None = None
    same_as_permanent: bool = False


class EmploymentIn(BaseModel):
    occupation: str | None = None
    employer_name: str | None = None
    position: str | None = None
    work_address: str | None = None
    salary_day: str | None = None


class ReferencePersonIn(BaseModel):
    seq: int
    full_name: str
    relationship: str | None = None
    phone: str | None = None
    same_address: bool = False


class SpouseIn(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    id_number: str | None = None
    income: Decimal | None = None
    employer_name: str | None = None
    employer_phone: str | None = None


class FinancialCapacityIn(BaseModel):
    total_income: Decimal
    personal_expense: Decimal | None = None


class ConsentIn(BaseModel):
    data_processing_consent: bool
    marketing_consent: bool = False
    consent_version: str | None = None


class PurposeGoodsIn(BaseModel):
    seq: int
    name: str | None = None
    brand: str | None = None
    serial_imei: str | None = None
    value: Decimal | None = None


class LoanPurposeIn(BaseModel):
    category: str  # consumer | living
    amount: Decimal
    purpose_detail: str | None = None
    prepaid_amount: Decimal | None = None
    goods: list[PurposeGoodsIn] = Field(default_factory=list)


class DisbursementIn(BaseModel):
    for_category: str | None = None
    method: str
    bank: str | None = None
    branch: str | None = None
    account_no: str | None = None
    account_name: str | None = None
    beneficiary_name: str | None = None
    beneficiary_tax_id: str | None = None


class SalesInfoIn(BaseModel):
    dsa_code: str | None = None
    witness_phone: str | None = None
    branch_pos_hub: str | None = None


class ApplicationCreateRequest(BaseModel):
    """POST /applications body — nested Section A."""

    product: str = "retail_unsecured_salary"
    total_amount: Decimal
    term_months: int
    lending_method: str = "per_loan"
    contract_no: str | None = None
    status: str = "submitted"

    applicant: ApplicantIn
    phone: ApplicantPhoneIn
    addresses: list[ApplicantAddressIn] = Field(default_factory=list)
    employment: EmploymentIn | None = None
    references: list[ReferencePersonIn] = Field(default_factory=list)
    spouse: SpouseIn | None = None
    financial: FinancialCapacityIn
    consent: ConsentIn
    purposes: list[LoanPurposeIn] = Field(default_factory=list)
    disbursements: list[DisbursementIn] = Field(default_factory=list)
    sales: SalesInfoIn | None = None


class ApplicationCreateResponse(BaseModel):
    id: UUID
    product: str
    status: str
    total_amount: Decimal
    term_months: int
    submitted_at: datetime | None
    source: str = "application-svc"
