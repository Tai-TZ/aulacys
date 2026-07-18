"""Env-driven settings for los-svc — Postgres only (docs/CONFIG.md)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    direct_url: str = ""
    db_schema: str = "los"
    service_name: str = "los-svc"
    version: str = "0.4.0"

    @property
    def alembic_url(self) -> str:
        url = self.direct_url or self.database_url
        if not url.startswith("postgres"):
            raise RuntimeError("Set DIRECT_URL or DATABASE_URL (Postgres) — SQLite is removed")
        return url

    def require_database_url(self) -> str:
        if not self.database_url.startswith("postgres"):
            raise RuntimeError(
                "DATABASE_URL is required for los-svc (Postgres only; see docs/CONFIG.md)"
            )
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
