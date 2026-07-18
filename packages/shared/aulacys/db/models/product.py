"""Retail loan product catalog — mirrors admin UI mock (`apps/web/.../mock-data.ts`).

Nested configs (interest, repayment, collateral, eligibility, document checklist)
live in JSONB so the admin form can round-trip without a forest of 1:1 tables.
Agent graph YAML (`agents/products/*.yaml`) is still the runtime source for
agents/tools/gate; `agent_product_id` links a catalog row to that file id.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from aulacys.db.base import Base


class ProductGroup(Base):
    __tablename__ = "product_group"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # e.g. vay-nha
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    icon_name: Mapped[str] = mapped_column(String(64), nullable=False, default="Briefcase")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    products: Mapped[list[LoanProduct]] = relationship(back_populates="group")


class LoanProduct(Base):
    __tablename__ = "loan_product"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    product_group_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("product_group.id"), nullable=False, index=True
    )
    customer_type: Mapped[str] = mapped_column(String(32), nullable=False, default="INDIVIDUAL")
    product_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    short_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    loan_method: Mapped[str] = mapped_column(Text, nullable=False, default="")
    secured_type: Mapped[str] = mapped_column(String(32), nullable=False, default="SECURED")
    min_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 0), nullable=True)
    max_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 0), nullable=True)
    min_term: Mapped[int | None] = mapped_column(Integer, nullable=True)  # months
    max_term: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="DRAFT", index=True)
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)  # %/year
    purpose: Mapped[str] = mapped_column(Text, nullable=False, default="")
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="VND")
    # Link to agents/products/<id>.yaml (e.g. retail_mortgage, loan-1)
    agent_product_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    segments: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    loan_structure: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    interest_config: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    repayment_config: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    collateral_config: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    eligibility: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    document_groups: Mapped[list[Any] | None] = mapped_column(JSONB, nullable=True)
    channels: Mapped[list[Any] | None] = mapped_column(JSONB, nullable=True)

    effective_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    group: Mapped[ProductGroup] = relationship(back_populates="products")
