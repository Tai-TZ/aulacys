"""Link loan applicants to the KYC customer profile dataset.

Revision ID: 0003_applicant_customer_id
Revises: 0002_application_document
Create Date: 2026-07-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003_applicant_customer_id"
down_revision = "0002_application_document"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("applicant", sa.Column("customer_id", sa.Text(), nullable=True))
    op.create_index("ix_applicant_customer_id", "applicant", ["customer_id"])


def downgrade() -> None:
    op.drop_index("ix_applicant_customer_id", table_name="applicant")
    op.drop_column("applicant", "customer_id")
