"""orchestrator workflow state

Revision ID: 0001_orchestrator
Revises:
Create Date: 2026-07-18
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_orchestrator"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "orchestrator_run",
        sa.Column("run_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", sa.Text(), nullable=False),
        sa.Column("application_id", sa.Text(), nullable=False),
        sa.Column("product", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("lane", sa.Integer(), nullable=True),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column(
            "veto_fired", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("replan_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "state_snapshot",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_orchestrator_run_application_id", "orchestrator_run", ["application_id"]
    )
    op.create_index("ix_orchestrator_run_status", "orchestrator_run", ["status"])

    op.create_table(
        "orchestrator_node_run",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orchestrator_run.run_id"),
            nullable=False,
        ),
        sa.Column("node", sa.Text(), nullable=False),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column(
            "tool_calls",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "output_ref",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_orchestrator_node_run_run_id", "orchestrator_node_run", ["run_id"]
    )
    op.create_index("ix_orchestrator_node_run_node", "orchestrator_node_run", ["node"])

    op.create_table(
        "orchestrator_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orchestrator_run.run_id"),
            nullable=False,
        ),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("run_id", "seq", name="uq_orchestrator_event_run_seq"),
    )
    op.create_index("ix_orchestrator_event_run_id", "orchestrator_event", ["run_id"])


def downgrade() -> None:
    op.drop_index("ix_orchestrator_event_run_id", table_name="orchestrator_event")
    op.drop_table("orchestrator_event")
    op.drop_index("ix_orchestrator_node_run_node", table_name="orchestrator_node_run")
    op.drop_index("ix_orchestrator_node_run_run_id", table_name="orchestrator_node_run")
    op.drop_table("orchestrator_node_run")
    op.drop_index("ix_orchestrator_run_status", table_name="orchestrator_run")
    op.drop_index("ix_orchestrator_run_application_id", table_name="orchestrator_run")
    op.drop_table("orchestrator_run")
