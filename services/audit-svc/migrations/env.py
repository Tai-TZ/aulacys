"""Alembic env — sync. Uses DIRECT_URL or DATABASE_URL (session-capable)."""

from __future__ import annotations

from logging.config import fileConfig
from urllib.parse import urlsplit, urlunsplit

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.db.base import Base
from app.db import models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _url() -> str:
    raw = get_settings().alembic_url
    if not raw:
        raise RuntimeError("Set DIRECT_URL or DATABASE_URL to run audit-svc migrations")
    parts = urlsplit(raw)
    scheme = "postgresql+psycopg" if parts.scheme in ("postgres", "postgresql") else parts.scheme
    return urlunsplit((scheme, parts.netloc, parts.path, "", ""))


def run_migrations_offline() -> None:
    context.configure(
        url=_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = _url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=get_settings().db_schema,
            include_schemas=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
