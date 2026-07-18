"""Loan product catalog CRUD — Postgres when enabled, in-memory fallback (demo-proof)."""

from __future__ import annotations

import asyncio
import logging
import re
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import is_enabled
from src.db.models.product import LoanProduct, ProductGroup
from src.models.schemas import (
    CatalogSeedResponse,
    LoanProductIn,
    LoanProductOut,
    ProductGroupIn,
    ProductGroupOut,
    ProductStatus,
)
from src.services.products_seed import SEED_GROUPS, SEED_PRODUCTS

logger = logging.getLogger(__name__)

# Remote Supabase can take 8–15s; demo UI must not hang. Budget then fall back to memory.
_DB_BUDGET_S = 2.5

_CUSTOMER_TYPE_NAME = {
    "INDIVIDUAL": "Khách hàng cá nhân",
    "BUSINESS": "Khách hàng doanh nghiệp",
}

# In-memory store (used when DB disabled or DB ops fail)
_mem_groups: dict[str, ProductGroupOut] = {}
_mem_products: dict[str, LoanProductOut] = {}
_mem_seeded = False


def _slug(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-") or "group"
    return base[:64]


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _fmt_date(value: date | None) -> str | None:
    return value.isoformat() if value else None


def _dec(value: float | int | Decimal | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def _float(value: Decimal | float | int | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _group_name(group_id: str) -> str:
    g = _mem_groups.get(group_id)
    return g.name if g else ""


def _product_out_from_orm(row: LoanProduct, group_name: str = "") -> LoanProductOut:
    ct = row.customer_type or "INDIVIDUAL"
    return LoanProductOut(
        id=str(row.id),
        customer_type=ct,
        customer_type_name=_CUSTOMER_TYPE_NAME.get(ct, ct),
        product_group_id=row.product_group_id,
        product_group_name=group_name or (row.group.name if row.group else ""),
        product_code=row.product_code,
        product_name=row.product_name,
        short_name=row.short_name,
        loan_method=row.loan_method or "",
        secured_type=row.secured_type or "SECURED",
        min_amount=_float(row.min_amount),
        max_amount=_float(row.max_amount),
        min_term=row.min_term,
        max_term=row.max_term,
        status=row.status or "DRAFT",
        interest_rate=_float(row.interest_rate),
        purpose=row.purpose or "",
        currency=row.currency or "VND",
        agent_product_id=row.agent_product_id,
        segments=list(row.segments or []),
        loan_structure=row.loan_structure,
        interest_config=row.interest_config,
        repayment_config=row.repayment_config,
        collateral_config=row.collateral_config,
        eligibility=row.eligibility,
        document_groups=row.document_groups,
        channels=list(row.channels) if row.channels else None,
        effective_start=_fmt_date(row.effective_start),
        effective_end=_fmt_date(row.effective_end),
        updated_at=row.updated_at.date().isoformat() if row.updated_at else "",
    )


def _ensure_mem_seeded() -> None:
    global _mem_seeded
    if _mem_seeded:
        return
    seed_memory()
    _mem_seeded = True


def seed_memory() -> CatalogSeedResponse:
    """Load default catalog into memory (idempotent by group id / product_code)."""
    g_count = 0
    for raw in SEED_GROUPS:
        if raw["id"] not in _mem_groups:
            _mem_groups[raw["id"]] = ProductGroupOut(**raw)
            g_count += 1
        else:
            _mem_groups[raw["id"]] = ProductGroupOut(**raw)
            g_count += 1
    p_count = 0
    for raw in SEED_PRODUCTS:
        code = raw["product_code"]
        existing_id = next((pid for pid, p in _mem_products.items() if p.product_code == code), None)
        pid = existing_id or str(uuid.uuid5(uuid.NAMESPACE_URL, f"aulacys:product:{code}"))
        out = LoanProductOut(
            id=pid,
            customer_type="INDIVIDUAL",
            customer_type_name=_CUSTOMER_TYPE_NAME["INDIVIDUAL"],
            product_group_id=raw["product_group_id"],
            product_group_name=_group_name(raw["product_group_id"])
            or next((g["name"] for g in SEED_GROUPS if g["id"] == raw["product_group_id"]), ""),
            product_code=code,
            product_name=raw["product_name"],
            short_name=raw.get("short_name"),
            loan_method=raw.get("loan_method", ""),
            secured_type=raw.get("secured_type", "SECURED"),
            min_amount=raw.get("min_amount"),
            max_amount=raw.get("max_amount"),
            min_term=raw.get("min_term"),
            max_term=raw.get("max_term"),
            status=raw.get("status", "DRAFT"),
            interest_rate=raw.get("interest_rate"),
            purpose=raw.get("purpose", ""),
            currency=raw.get("currency", "VND"),
            agent_product_id=raw.get("agent_product_id"),
            segments=list(raw.get("segments") or []),
            loan_structure=raw.get("loan_structure"),
            interest_config=raw.get("interest_config"),
            repayment_config=raw.get("repayment_config"),
            collateral_config=raw.get("collateral_config"),
            eligibility=raw.get("eligibility"),
            document_groups=raw.get("document_groups"),
            channels=raw.get("channels"),
            updated_at=datetime.now(UTC).date().isoformat(),
        )
        _mem_products[pid] = out
        p_count += 1
    return CatalogSeedResponse(groups_upserted=g_count, products_upserted=p_count, source="memory")


async def _session() -> AsyncSession | None:
    if not is_enabled():
        return None
    try:
        maker = __import__("src.db.session", fromlist=["_get_sessionmaker"])._get_sessionmaker()
        return maker()
    except Exception:
        logger.exception("product catalog: cannot open DB session")
        return None


async def seed_catalog() -> CatalogSeedResponse:
    """Seed memory always; also upsert into DB when available (budgeted — never block demo UI)."""
    mem = seed_memory()
    global _mem_seeded
    _mem_seeded = True

    session_cm = await _session()
    if session_cm is None:
        return mem

    async def _seed_db() -> CatalogSeedResponse:
        async with session_cm as session:
            g_n = 0
            for raw in SEED_GROUPS:
                row = await session.get(ProductGroup, raw["id"])
                if row is None:
                    session.add(ProductGroup(**raw))
                else:
                    row.name = raw["name"]
                    row.description = raw["description"]
                    row.icon_name = raw["icon_name"]
                    row.is_active = raw["is_active"]
                    row.display_order = raw["display_order"]
                g_n += 1
            await session.flush()

            p_n = 0
            for raw in SEED_PRODUCTS:
                code = raw["product_code"]
                result = await session.execute(select(LoanProduct).where(LoanProduct.product_code == code))
                row = result.scalar_one_or_none()
                pid = uuid.uuid5(uuid.NAMESPACE_URL, f"aulacys:product:{code}")
                fields = {
                    "product_group_id": raw["product_group_id"],
                    "customer_type": "INDIVIDUAL",
                    "product_code": code,
                    "product_name": raw["product_name"],
                    "short_name": raw.get("short_name"),
                    "loan_method": raw.get("loan_method", ""),
                    "secured_type": raw.get("secured_type", "SECURED"),
                    "min_amount": _dec(raw.get("min_amount")),
                    "max_amount": _dec(raw.get("max_amount")),
                    "min_term": raw.get("min_term"),
                    "max_term": raw.get("max_term"),
                    "status": raw.get("status", "DRAFT"),
                    "interest_rate": _dec(raw.get("interest_rate")),
                    "purpose": raw.get("purpose", ""),
                    "currency": raw.get("currency", "VND"),
                    "agent_product_id": raw.get("agent_product_id"),
                    "segments": list(raw.get("segments") or []),
                    "loan_structure": raw.get("loan_structure"),
                    "interest_config": raw.get("interest_config"),
                    "repayment_config": raw.get("repayment_config"),
                    "collateral_config": raw.get("collateral_config"),
                    "eligibility": raw.get("eligibility"),
                    "document_groups": raw.get("document_groups"),
                    "channels": raw.get("channels"),
                }
                if row is None:
                    session.add(LoanProduct(id=pid, **fields))
                else:
                    for k, v in fields.items():
                        setattr(row, k, v)
                p_n += 1
            await session.commit()
            await _hydrate_mem_from_db(session)
            return CatalogSeedResponse(groups_upserted=g_n, products_upserted=p_n, source="database")

    try:
        return await asyncio.wait_for(_seed_db(), timeout=_DB_BUDGET_S)
    except TimeoutError:
        logger.warning("seed_catalog: DB budget exceeded — memory seed only")
        return mem
    except Exception:
        logger.exception("product catalog seed DB failed — using memory")
        return mem


async def _hydrate_mem_from_db(session: AsyncSession) -> None:
    groups = (await session.execute(select(ProductGroup).order_by(ProductGroup.display_order))).scalars().all()
    _mem_groups.clear()
    for g in groups:
        _mem_groups[g.id] = ProductGroupOut(
            id=g.id,
            name=g.name,
            description=g.description or "",
            icon_name=g.icon_name or "Briefcase",
            is_active=bool(g.is_active),
            display_order=g.display_order or 0,
        )
    products = (await session.execute(select(LoanProduct))).scalars().all()
    _mem_products.clear()
    for p in products:
        _mem_products[str(p.id)] = _product_out_from_orm(
            p, _mem_groups.get(p.product_group_id, ProductGroupOut(id="", name="")).name
        )


async def list_groups() -> list[ProductGroupOut]:
    """Serve catalog from memory. DB is write-through on mutations (Supabase RTT is too slow for list)."""
    _ensure_mem_seeded()
    return sorted(_mem_groups.values(), key=lambda g: g.display_order)


async def create_group(payload: ProductGroupIn) -> ProductGroupOut:
    _ensure_mem_seeded()
    gid = (payload.id or _slug(payload.name)).strip()[:64]
    if gid in _mem_groups:
        raise ValueError(f"group id already exists: {gid}")
    out = ProductGroupOut(
        id=gid,
        name=payload.name,
        description=payload.description,
        icon_name=payload.icon_name,
        is_active=payload.is_active,
        display_order=payload.display_order,
    )
    session_cm = await _session()
    if session_cm is not None:
        try:
            async with session_cm as session:
                if await session.get(ProductGroup, gid):
                    raise ValueError(f"group id already exists: {gid}")
                session.add(
                    ProductGroup(
                        id=gid,
                        name=payload.name,
                        description=payload.description,
                        icon_name=payload.icon_name,
                        is_active=payload.is_active,
                        display_order=payload.display_order,
                    )
                )
                await session.commit()
        except ValueError:
            raise
        except Exception:
            logger.exception("create_group DB failed — memory only")
    _mem_groups[gid] = out
    return out


async def update_group(group_id: str, payload: ProductGroupIn) -> ProductGroupOut:
    _ensure_mem_seeded()
    if group_id not in _mem_groups:
        # try DB
        pass
    out = ProductGroupOut(
        id=group_id,
        name=payload.name,
        description=payload.description,
        icon_name=payload.icon_name,
        is_active=payload.is_active,
        display_order=payload.display_order,
    )
    session_cm = await _session()
    if session_cm is not None:
        try:
            async with session_cm as session:
                row = await session.get(ProductGroup, group_id)
                if row is None and group_id not in _mem_groups:
                    raise KeyError(group_id)
                if row is not None:
                    row.name = payload.name
                    row.description = payload.description
                    row.icon_name = payload.icon_name
                    row.is_active = payload.is_active
                    row.display_order = payload.display_order
                    await session.commit()
        except KeyError:
            raise
        except Exception:
            logger.exception("update_group DB failed — memory only")
    if group_id not in _mem_groups and session_cm is None:
        raise KeyError(group_id)
    _mem_groups[group_id] = out
    for pid, prod in list(_mem_products.items()):
        if prod.product_group_id == group_id:
            _mem_products[pid] = prod.model_copy(update={"product_group_name": payload.name})
    return out


async def delete_group(group_id: str) -> None:
    _ensure_mem_seeded()
    if any(p.product_group_id == group_id for p in _mem_products.values()):
        raise ValueError("cannot delete group that still has products")
    session_cm = await _session()
    if session_cm is not None:
        try:
            async with session_cm as session:
                n = await session.scalar(
                    select(LoanProduct.id).where(LoanProduct.product_group_id == group_id).limit(1)
                )
                if n is not None:
                    raise ValueError("cannot delete group that still has products")
                row = await session.get(ProductGroup, group_id)
                if row is not None:
                    await session.delete(row)
                    await session.commit()
        except ValueError:
            raise
        except Exception:
            logger.exception("delete_group DB failed — memory only")
    if group_id in _mem_groups:
        del _mem_groups[group_id]
    elif session_cm is None:
        raise KeyError(group_id)


async def list_products(*, customer_type: str | None = None) -> list[LoanProductOut]:
    """Serve catalog from memory so admin UI is not blocked by Supabase latency."""
    _ensure_mem_seeded()
    items = list(_mem_products.values())
    if customer_type:
        items = [p for p in items if p.customer_type == customer_type]
    return sorted(items, key=lambda p: p.product_code)


async def get_product(product_id: str) -> LoanProductOut | None:
    _ensure_mem_seeded()
    if product_id in _mem_products:
        return _mem_products[product_id]
    session_cm = await _session()
    if session_cm is None:
        return None
    try:
        async with session_cm as session:
            try:
                uid = uuid.UUID(product_id)
            except ValueError:
                return None
            row = await session.get(LoanProduct, uid)
            if row is None:
                return None
            g = await session.get(ProductGroup, row.product_group_id)
            out = _product_out_from_orm(row, g.name if g else "")
            _mem_products[out.id] = out
            return out
    except Exception:
        logger.exception("get_product DB failed")
        return None


def _apply_in(payload: LoanProductIn, *, product_id: str, group_name: str) -> LoanProductOut:
    ct = payload.customer_type
    return LoanProductOut(
        id=product_id,
        customer_type=ct,
        customer_type_name=_CUSTOMER_TYPE_NAME.get(ct, ct),
        product_group_id=payload.product_group_id,
        product_group_name=group_name,
        product_code=payload.product_code.strip().upper(),
        product_name=payload.product_name,
        short_name=payload.short_name,
        loan_method=payload.loan_method,
        secured_type=payload.secured_type,
        min_amount=payload.min_amount,
        max_amount=payload.max_amount,
        min_term=payload.min_term,
        max_term=payload.max_term,
        status=payload.status,
        interest_rate=payload.interest_rate,
        purpose=payload.purpose,
        currency=payload.currency,
        agent_product_id=payload.agent_product_id,
        segments=list(payload.segments),
        loan_structure=payload.loan_structure,
        interest_config=payload.interest_config,
        repayment_config=payload.repayment_config,
        collateral_config=payload.collateral_config,
        eligibility=payload.eligibility,
        document_groups=payload.document_groups,
        channels=payload.channels,
        effective_start=payload.effective_start,
        effective_end=payload.effective_end,
        updated_at=datetime.now(UTC).date().isoformat(),
    )


async def create_product(payload: LoanProductIn) -> LoanProductOut:
    _ensure_mem_seeded()
    code = payload.product_code.strip().upper()
    if any(p.product_code == code for p in _mem_products.values()):
        raise ValueError(f"product_code already exists: {code}")
    if payload.product_group_id not in _mem_groups:
        # allow if DB has it
        session_cm = await _session()
        if session_cm is not None:
            async with session_cm as session:
                if await session.get(ProductGroup, payload.product_group_id) is None:
                    raise ValueError(f"unknown product_group_id: {payload.product_group_id}")
        else:
            raise ValueError(f"unknown product_group_id: {payload.product_group_id}")

    pid = str(uuid.uuid4())
    group_name = _group_name(payload.product_group_id)
    out = _apply_in(payload, product_id=pid, group_name=group_name)

    session_cm = await _session()
    if session_cm is not None:
        try:
            async with session_cm as session:
                exists = await session.scalar(select(LoanProduct.id).where(LoanProduct.product_code == code))
                if exists is not None:
                    raise ValueError(f"product_code already exists: {code}")
                g = await session.get(ProductGroup, payload.product_group_id)
                if g is None:
                    raise ValueError(f"unknown product_group_id: {payload.product_group_id}")
                group_name = g.name
                out = _apply_in(payload, product_id=pid, group_name=group_name)
                session.add(
                    LoanProduct(
                        id=uuid.UUID(pid),
                        product_group_id=payload.product_group_id,
                        customer_type=payload.customer_type,
                        product_code=code,
                        product_name=payload.product_name,
                        short_name=payload.short_name,
                        loan_method=payload.loan_method,
                        secured_type=payload.secured_type,
                        min_amount=_dec(payload.min_amount),
                        max_amount=_dec(payload.max_amount),
                        min_term=payload.min_term,
                        max_term=payload.max_term,
                        status=payload.status,
                        interest_rate=_dec(payload.interest_rate),
                        purpose=payload.purpose,
                        currency=payload.currency,
                        agent_product_id=payload.agent_product_id,
                        segments=list(payload.segments),
                        loan_structure=payload.loan_structure,
                        interest_config=payload.interest_config,
                        repayment_config=payload.repayment_config,
                        collateral_config=payload.collateral_config,
                        eligibility=payload.eligibility,
                        document_groups=payload.document_groups,
                        channels=payload.channels,
                        effective_start=_parse_date(payload.effective_start),
                        effective_end=_parse_date(payload.effective_end),
                    )
                )
                await session.commit()
        except ValueError:
            raise
        except Exception:
            logger.exception("create_product DB failed — memory only")

    _mem_products[pid] = out
    return out


async def update_product(product_id: str, payload: LoanProductIn) -> LoanProductOut:
    _ensure_mem_seeded()
    if product_id not in _mem_products:
        got = await get_product(product_id)
        if got is None:
            raise KeyError(product_id)
    code = payload.product_code.strip().upper()
    for pid, p in _mem_products.items():
        if p.product_code == code and pid != product_id:
            raise ValueError(f"product_code already exists: {code}")
    group_name = _group_name(payload.product_group_id) or _mem_products[product_id].product_group_name
    out = _apply_in(payload, product_id=product_id, group_name=group_name)

    session_cm = await _session()
    if session_cm is not None:
        try:
            async with session_cm as session:
                row = await session.get(LoanProduct, uuid.UUID(product_id))
                if row is None:
                    raise KeyError(product_id)
                clash = await session.scalar(
                    select(LoanProduct.id).where(LoanProduct.product_code == code, LoanProduct.id != row.id)
                )
                if clash is not None:
                    raise ValueError(f"product_code already exists: {code}")
                row.product_group_id = payload.product_group_id
                row.customer_type = payload.customer_type
                row.product_code = code
                row.product_name = payload.product_name
                row.short_name = payload.short_name
                row.loan_method = payload.loan_method
                row.secured_type = payload.secured_type
                row.min_amount = _dec(payload.min_amount)
                row.max_amount = _dec(payload.max_amount)
                row.min_term = payload.min_term
                row.max_term = payload.max_term
                row.status = payload.status
                row.interest_rate = _dec(payload.interest_rate)
                row.purpose = payload.purpose
                row.currency = payload.currency
                row.agent_product_id = payload.agent_product_id
                row.segments = list(payload.segments)
                row.loan_structure = payload.loan_structure
                row.interest_config = payload.interest_config
                row.repayment_config = payload.repayment_config
                row.collateral_config = payload.collateral_config
                row.eligibility = payload.eligibility
                row.document_groups = payload.document_groups
                row.channels = payload.channels
                row.effective_start = _parse_date(payload.effective_start)
                row.effective_end = _parse_date(payload.effective_end)
                await session.commit()
                g = await session.get(ProductGroup, payload.product_group_id)
                out = _product_out_from_orm(row, g.name if g else group_name)
        except (KeyError, ValueError):
            raise
        except Exception:
            logger.exception("update_product DB failed — memory only")

    _mem_products[product_id] = out
    return out


async def patch_product_status(product_id: str, status: ProductStatus) -> LoanProductOut:
    prod = await get_product(product_id)
    if prod is None:
        raise KeyError(product_id)
    payload = LoanProductIn(
        customer_type=prod.customer_type,  # type: ignore[arg-type]
        product_group_id=prod.product_group_id,
        product_code=prod.product_code,
        product_name=prod.product_name,
        short_name=prod.short_name,
        loan_method=prod.loan_method,
        secured_type=prod.secured_type,  # type: ignore[arg-type]
        min_amount=prod.min_amount,
        max_amount=prod.max_amount,
        min_term=prod.min_term,
        max_term=prod.max_term,
        status=status,
        interest_rate=prod.interest_rate,
        purpose=prod.purpose,
        currency=prod.currency,
        agent_product_id=prod.agent_product_id,
        segments=prod.segments,
        loan_structure=prod.loan_structure,
        interest_config=prod.interest_config,
        repayment_config=prod.repayment_config,
        collateral_config=prod.collateral_config,
        eligibility=prod.eligibility,
        document_groups=prod.document_groups,
        channels=prod.channels,
        effective_start=prod.effective_start,
        effective_end=prod.effective_end,
    )
    return await update_product(product_id, payload)


async def delete_product(product_id: str) -> None:
    _ensure_mem_seeded()
    session_cm = await _session()
    if session_cm is not None:
        try:
            async with session_cm as session:
                try:
                    uid = uuid.UUID(product_id)
                except ValueError as exc:
                    raise KeyError(product_id) from exc
                row = await session.get(LoanProduct, uid)
                if row is not None:
                    await session.delete(row)
                    await session.commit()
                elif product_id not in _mem_products:
                    raise KeyError(product_id)
        except KeyError:
            raise
        except Exception:
            logger.exception("delete_product DB failed — memory only")
    if product_id in _mem_products:
        del _mem_products[product_id]
    elif session_cm is None:
        raise KeyError(product_id)


def reset_memory_for_tests() -> None:
    """Test helper — clear and re-seed memory store."""
    global _mem_seeded
    _mem_groups.clear()
    _mem_products.clear()
    _mem_seeded = False
