"""audit ledger — append-only + hash chain + immutability triggers

Revision ID: 0001_audit
Revises:
Create Date: 2026-07-18
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_audit"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_record",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", sa.Text(), nullable=False),
        sa.Column("product", sa.Text(), nullable=False),
        sa.Column("lane", sa.Integer(), nullable=False),
        sa.Column("outcome", sa.Text(), nullable=False),
        sa.Column("veto_fired", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("replan_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("as_of", sa.Date(), nullable=False),
        sa.Column("signed_by", sa.Text(), nullable=False),
        sa.Column("decided_at", sa.Text(), nullable=False),
        sa.Column("decided_at_ts", sa.DateTime(timezone=True), nullable=True),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("prev_hash", sa.String(64), nullable=True),
    )
    op.create_index("ix_audit_record_application_id", "audit_record", ["application_id"])
    op.create_index("ix_audit_record_seq", "audit_record", ["seq"])

    op.create_table(
        "audit_violation",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "record_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audit_record.id"),
            nullable=False,
        ),
        sa.Column("rule_id", sa.Text(), nullable=False),
        sa.Column("rule_version", sa.Text(), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("legal_basis", sa.Text(), nullable=False),
        sa.Column("metric_name", sa.Text(), nullable=False),
        sa.Column("metric_value", sa.Float(), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=True),
        sa.Column("is_blocking", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_audit_violation_record_id", "audit_violation", ["record_id"])

    op.execute(
        """
        CREATE OR REPLACE FUNCTION forbid_audit_mutation() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'audit rows are immutable (append-only)';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    for table in ("audit_record", "audit_violation"):
        op.execute(
            f"""
            CREATE TRIGGER {table}_immutable
            BEFORE UPDATE OR DELETE ON {table}
            FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();
            """
        )


def downgrade() -> None:
    for table in ("audit_record", "audit_violation"):
        op.execute(f"DROP TRIGGER IF EXISTS {table}_immutable ON {table};")
    op.execute("DROP FUNCTION IF EXISTS forbid_audit_mutation();")
    op.drop_index("ix_audit_violation_record_id", table_name="audit_violation")
    op.drop_table("audit_violation")
    op.drop_index("ix_audit_record_seq", table_name="audit_record")
    op.drop_index("ix_audit_record_application_id", table_name="audit_record")
    op.drop_table("audit_record")
