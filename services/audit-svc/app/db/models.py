"""ORM models — mirror of migrations/versions/0001_audit.py."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuditRecord(Base):
    __tablename__ = "audit_record"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    product: Mapped[str] = mapped_column(Text, nullable=False)
    lane: Mapped[int] = mapped_column(Integer, nullable=False)
    outcome: Mapped[str] = mapped_column(Text, nullable=False)
    veto_fired: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    replan_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    as_of: Mapped[date] = mapped_column(Date, nullable=False)
    signed_by: Mapped[str] = mapped_column(Text, nullable=False)
    # ISO string also kept for hash-chain stability (same bytes as SQLite path).
    decided_at: Mapped[str] = mapped_column(Text, nullable=False)
    decided_at_ts: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    seq: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    violations: Mapped[list["AuditViolation"]] = relationship(back_populates="record")


class AuditViolation(Base):
    __tablename__ = "audit_violation"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_record.id"), nullable=False, index=True
    )
    rule_id: Mapped[str] = mapped_column(Text, nullable=False)
    rule_version: Mapped[str] = mapped_column(Text, nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    legal_basis: Mapped[str] = mapped_column(Text, nullable=False)
    metric_name: Mapped[str] = mapped_column(Text, nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_blocking: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    record: Mapped["AuditRecord"] = relationship(back_populates="violations")
