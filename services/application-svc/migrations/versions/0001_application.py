"""SHBFinance Section A tables (docs/APPLICATION-SCHEMA.md)

Revision ID: 0001_application
Revises:
Create Date: 2026-07-18
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_application"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "loan_application",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("contract_no", sa.Text(), nullable=True),
        sa.Column("product", sa.Text(), nullable=False, server_default="retail_unsecured_salary"),
        sa.Column("total_amount", sa.Numeric(18, 0), nullable=False),
        sa.Column("term_months", sa.Integer(), nullable=False),
        sa.Column("lending_method", sa.Text(), nullable=False, server_default="per_loan"),
        sa.Column("status", sa.Text(), nullable=False, server_default="submitted"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_loan_application_status", "loan_application", ["status"])

    op.create_table(
        "applicant",
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), primary_key=True),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("gender", sa.Text(), nullable=True),
        sa.Column("id_number", sa.Text(), nullable=False),
        sa.Column("id_issue_date", sa.Date(), nullable=True),
        sa.Column("id_issue_place", sa.Text(), nullable=True),
        sa.Column("old_id_number", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
    )
    op.create_index("ix_applicant_id_number", "applicant", ["id_number"])

    op.create_table(
        "applicant_phone",
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), primary_key=True),
        sa.Column("mobile_1", sa.Text(), nullable=False),
        sa.Column("mobile_2", sa.Text(), nullable=True),
        sa.Column("zalo_phone", sa.Text(), nullable=True),
    )

    op.create_table(
        "applicant_address",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("street", sa.Text(), nullable=True),
        sa.Column("ward", sa.Text(), nullable=True),
        sa.Column("district", sa.Text(), nullable=True),
        sa.Column("province", sa.Text(), nullable=True),
        sa.Column("same_as_permanent", sa.Boolean(), nullable=True, server_default=sa.text("false")),
    )
    op.create_index("ix_applicant_address_application_id", "applicant_address", ["application_id"])

    op.create_table(
        "employment",
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), primary_key=True),
        sa.Column("occupation", sa.Text(), nullable=True),
        sa.Column("employer_name", sa.Text(), nullable=True),
        sa.Column("position", sa.Text(), nullable=True),
        sa.Column("work_address", sa.Text(), nullable=True),
        sa.Column("salary_day", sa.Text(), nullable=True),
    )

    op.create_table(
        "reference_person",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("relationship", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("same_address", sa.Boolean(), nullable=True, server_default=sa.text("false")),
    )
    op.create_index("ix_reference_person_application_id", "reference_person", ["application_id"])

    op.create_table(
        "spouse",
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), primary_key=True),
        sa.Column("full_name", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("id_number", sa.Text(), nullable=True),
        sa.Column("income", sa.Numeric(18, 0), nullable=True),
        sa.Column("employer_name", sa.Text(), nullable=True),
        sa.Column("employer_phone", sa.Text(), nullable=True),
    )

    op.create_table(
        "financial_capacity",
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), primary_key=True),
        sa.Column("total_income", sa.Numeric(18, 0), nullable=False),
        sa.Column("personal_expense", sa.Numeric(18, 0), nullable=True),
    )

    op.create_table(
        "consent",
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), primary_key=True),
        sa.Column("data_processing_consent", sa.Boolean(), nullable=False),
        sa.Column("marketing_consent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("consent_version", sa.Text(), nullable=True),
        sa.Column("consent_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "loan_purpose",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(18, 0), nullable=False),
        sa.Column("purpose_detail", sa.Text(), nullable=True),
        sa.Column("prepaid_amount", sa.Numeric(18, 0), nullable=True),
    )
    op.create_index("ix_loan_purpose_application_id", "loan_purpose", ["application_id"])

    op.create_table(
        "purpose_goods",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("purpose_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_purpose.id"), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("name", sa.Text(), nullable=True),
        sa.Column("brand", sa.Text(), nullable=True),
        sa.Column("serial_imei", sa.Text(), nullable=True),
        sa.Column("value", sa.Numeric(18, 0), nullable=True),
    )
    op.create_index("ix_purpose_goods_purpose_id", "purpose_goods", ["purpose_id"])

    op.create_table(
        "disbursement",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), nullable=False),
        sa.Column("for_category", sa.Text(), nullable=True),
        sa.Column("method", sa.Text(), nullable=False),
        sa.Column("bank", sa.Text(), nullable=True),
        sa.Column("branch", sa.Text(), nullable=True),
        sa.Column("account_no", sa.Text(), nullable=True),
        sa.Column("account_name", sa.Text(), nullable=True),
        sa.Column("beneficiary_name", sa.Text(), nullable=True),
        sa.Column("beneficiary_tax_id", sa.Text(), nullable=True),
    )
    op.create_index("ix_disbursement_application_id", "disbursement", ["application_id"])

    op.create_table(
        "sales_info",
        sa.Column("application_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loan_application.id"), primary_key=True),
        sa.Column("dsa_code", sa.Text(), nullable=True),
        sa.Column("witness_phone", sa.Text(), nullable=True),
        sa.Column("branch_pos_hub", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("sales_info")
    op.drop_index("ix_disbursement_application_id", table_name="disbursement")
    op.drop_table("disbursement")
    op.drop_index("ix_purpose_goods_purpose_id", table_name="purpose_goods")
    op.drop_table("purpose_goods")
    op.drop_index("ix_loan_purpose_application_id", table_name="loan_purpose")
    op.drop_table("loan_purpose")
    op.drop_table("consent")
    op.drop_table("financial_capacity")
    op.drop_table("spouse")
    op.drop_index("ix_reference_person_application_id", table_name="reference_person")
    op.drop_table("reference_person")
    op.drop_table("employment")
    op.drop_index("ix_applicant_address_application_id", table_name="applicant_address")
    op.drop_table("applicant_address")
    op.drop_table("applicant_phone")
    op.drop_index("ix_applicant_id_number", table_name="applicant")
    op.drop_table("applicant")
    op.drop_index("ix_loan_application_status", table_name="loan_application")
    op.drop_table("loan_application")
