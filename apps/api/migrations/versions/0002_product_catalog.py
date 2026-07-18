"""product catalog — admin UI loan products

Revision ID: 0002_product_catalog
Revises: 0001_audit_chain
Create Date: 2026-07-18

Maps apps/web loan-products mock-data → Postgres. Nested form configs are JSONB.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_product_catalog"
down_revision = "0001_audit_chain"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_group",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("icon_name", sa.String(length=64), nullable=False, server_default="Briefcase"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "loan_product",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("product_group_id", sa.String(length=64), sa.ForeignKey("product_group.id"), nullable=False),
        sa.Column("customer_type", sa.String(length=32), nullable=False, server_default="INDIVIDUAL"),
        sa.Column("product_code", sa.String(length=64), nullable=False),
        sa.Column("product_name", sa.Text(), nullable=False),
        sa.Column("short_name", sa.Text(), nullable=True),
        sa.Column("loan_method", sa.Text(), nullable=False, server_default=""),
        sa.Column("secured_type", sa.String(length=32), nullable=False, server_default="SECURED"),
        sa.Column("min_amount", sa.Numeric(18, 0), nullable=True),
        sa.Column("max_amount", sa.Numeric(18, 0), nullable=True),
        sa.Column("min_term", sa.Integer(), nullable=True),
        sa.Column("max_term", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="DRAFT"),
        sa.Column("interest_rate", sa.Numeric(8, 4), nullable=True),
        sa.Column("purpose", sa.Text(), nullable=False, server_default=""),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="VND"),
        sa.Column("agent_product_id", sa.String(length=64), nullable=True),
        sa.Column("segments", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("loan_structure", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("interest_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("repayment_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("collateral_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("eligibility", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("document_groups", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("channels", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("effective_start", sa.Date(), nullable=True),
        sa.Column("effective_end", sa.Date(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_loan_product_product_group_id", "loan_product", ["product_group_id"])
    op.create_index("ix_loan_product_product_code", "loan_product", ["product_code"], unique=True)
    op.create_index("ix_loan_product_status", "loan_product", ["status"])
    op.create_index("ix_loan_product_agent_product_id", "loan_product", ["agent_product_id"])


def downgrade() -> None:
    op.drop_index("ix_loan_product_agent_product_id", table_name="loan_product")
    op.drop_index("ix_loan_product_status", table_name="loan_product")
    op.drop_index("ix_loan_product_product_code", table_name="loan_product")
    op.drop_index("ix_loan_product_product_group_id", table_name="loan_product")
    op.drop_table("loan_product")
    op.drop_table("product_group")
