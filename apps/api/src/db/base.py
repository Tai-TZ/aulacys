"""Declarative base for ORM models.

All models inherit from `Base` so Alembic autogenerate sees them via
`Base.metadata`. Define models in `src/db/models/` and import them in
`migrations/env.py` before autogenerate.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
