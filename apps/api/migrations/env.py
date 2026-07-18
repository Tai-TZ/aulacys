"""Alembic environment — async, Supabase session pooler (DIRECT_URL, :5432).

Migrations MUST use DIRECT_URL, never the runtime transaction pooler (:6543):
DDL and Alembic's advisory locks need a real session, which pgbouncer's
transaction mode does not provide.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy.pool import NullPool

from src.config import get_settings
from src.db.base import Base

# Import model modules here so Base.metadata is fully populated for autogenerate:
from src.db import models  # noqa: F401, E402

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _migration_url() -> str:
    """DIRECT_URL for migrations; fall back to DATABASE_URL if unset.

    Use SQLAlchemy ``make_url`` (not ``urlsplit``): Supabase userinfo can contain
    dots/brackets that break urllib's IPv6-bracket check.
    """
    settings = get_settings()
    raw = settings.direct_url or settings.database_url
    if not raw:
        raise RuntimeError(
            "No DIRECT_URL/DATABASE_URL set — cannot run migrations. Set them in apps/api/.env (see .env.example)."
        )
    url = make_url(raw)
    # asyncpg driver; drop query params (pgbouncer=true etc. are Prisma-isms)
    return url.set(drivername="postgresql+asyncpg").render_as_string(hide_password=False).split("?", 1)[0]


def run_migrations_offline() -> None:
    context.configure(
        url=_migration_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _migration_url()
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(_do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
