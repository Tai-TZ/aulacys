"""ORM models. Import every module here so `Base.metadata` sees all tables.

`migrations/env.py` imports this package before autogenerate.
"""

from src.db.models.audit import AuditRecord, AuditViolation
from src.db.models.product import LoanProduct, ProductGroup

__all__ = ["AuditRecord", "AuditViolation", "LoanProduct", "ProductGroup"]
