"""Database layer — Supabase Postgres via SQLAlchemy async.

Public surface:
    from aulacys.db import Base, get_db, ping, is_enabled

Runtime queries use the transaction pooler (:6543); Alembic migrations use the
session pooler (DIRECT_URL, :5432). See docs/DATABASE.md.
"""

from aulacys.db.base import Base
from aulacys.db.session import dispose, get_db, is_enabled, ping

__all__ = ["Base", "dispose", "get_db", "is_enabled", "ping"]
