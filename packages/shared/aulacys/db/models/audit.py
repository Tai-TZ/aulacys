"""Immutable audit chain — the record a bank inspector reads.

NOT trace. Trace (token/latency/cache) is disposable and lives in-memory /
dashboard. Audit is append-only and tamper-evident: see the immutability
triggers and hash chain in the migration. Mixing the two breaks both
(BUILD-GUIDE §8.1).

One `AuditRecord` per decision; one `AuditViolation` per rule that fired.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from aulacys.db.base import Base


class AuditRecord(Base):
    __tablename__ = "audit_record"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    application_id: Mapped[str] = mapped_column(String, index=True)
    product: Mapped[str] = mapped_column(String)
    lane: Mapped[int] = mapped_column(Integer)
    outcome: Mapped[str] = mapped_column(String)  # stp_approved | vetoed | hitl
    veto_fired: Mapped[bool] = mapped_column(Boolean, default=False)
    replan_count: Mapped[int] = mapped_column(Integer, default=0)
    # as_of the policy was evaluated at — the breakthrough-B evidence. Same
    # application, different as_of -> different verdict. Never null.
    as_of: Mapped[date] = mapped_column(Date)
    signed_by: Mapped[str] = mapped_column(String)  # "system" (STP) | human id (HITL)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Tamper-evident chain: content_hash = sha256(this row); prev_hash links the
    # previous record. Editing a row mid-chain breaks the hash and shows.
    content_hash: Mapped[str] = mapped_column(String)
    prev_hash: Mapped[str | None] = mapped_column(String, nullable=True)

    violations: Mapped[list[AuditViolation]] = relationship(back_populates="record", cascade="all, delete-orphan")


class AuditViolation(Base):
    __tablename__ = "audit_violation"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    record_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("audit_record.id"), index=True)
    rule_id: Mapped[str] = mapped_column(String)
    # An inspector rejects a veto without a version. Never null.
    rule_version: Mapped[str] = mapped_column(String)
    effective_from: Mapped[date] = mapped_column(Date)
    legal_basis: Mapped[str] = mapped_column(String)
    metric_name: Mapped[str] = mapped_column(String)  # e.g. dti, ltv
    metric_value: Mapped[float] = mapped_column(Float)
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_blocking: Mapped[bool] = mapped_column(Boolean, default=False)

    record: Mapped[AuditRecord] = relationship(back_populates="violations")
