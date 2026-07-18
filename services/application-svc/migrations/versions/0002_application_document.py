"""application_document checklist / uploads

Revision ID: 0002_application_document
Revises: 0001_application
Create Date: 2026-07-18

Mirrors workspace DOSSIER_DOCS + assess Document badges (docs/APPLICATION-SCHEMA.md).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_application_document"
down_revision = "0001_application"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "application_document",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "application_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("loan_application.id"),
            nullable=False,
        ),
        sa.Column("doc_type", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="missing"),
        sa.Column("required_for", sa.Text(), nullable=True),
        sa.Column("storage_uri", sa.Text(), nullable=True),
        sa.Column("tier", sa.Integer(), nullable=True),
        sa.Column("confirmed_by", sa.Text(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_application_document_application_id",
        "application_document",
        ["application_id"],
    )
    op.create_index(
        "ix_application_document_doc_type", "application_document", ["doc_type"]
    )


def downgrade() -> None:
    op.drop_index("ix_application_document_doc_type", table_name="application_document")
    op.drop_index(
        "ix_application_document_application_id", table_name="application_document"
    )
    op.drop_table("application_document")
