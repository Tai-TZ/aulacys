"""loan_ticket + ticket_history

Revision ID: 0001_los
Revises:
Create Date: 2026-07-18
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_los"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "loan_ticket",
        sa.Column("ticket_id", sa.Text(), primary_key=True),
        sa.Column("application_id", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("product", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("assigned_to", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_loan_ticket_application_id", "loan_ticket", ["application_id"])
    op.create_index("ix_loan_ticket_status", "loan_ticket", ["status"])

    op.create_table(
        "ticket_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ticket_id", sa.Text(), sa.ForeignKey("loan_ticket.ticket_id"), nullable=False),
        sa.Column("old_status", sa.Text(), nullable=True),
        sa.Column("new_status", sa.Text(), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("changed_by", sa.Text(), nullable=True),
    )
    op.create_index("ix_ticket_history_ticket_id", "ticket_history", ["ticket_id"])


def downgrade() -> None:
    op.drop_index("ix_ticket_history_ticket_id", table_name="ticket_history")
    op.drop_table("ticket_history")
    op.drop_index("ix_loan_ticket_status", table_name="loan_ticket")
    op.drop_index("ix_loan_ticket_application_id", table_name="loan_ticket")
    op.drop_table("loan_ticket")
