"""Env-driven settings for application-svc — Postgres only (docs/CONFIG.md)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    direct_url: str = ""
    db_schema: str = "application"
    service_name: str = "application-svc"
    version: str = "0.1.0"
    # Comma-separated browser origins (Cloud Run web has two URL forms).
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def alembic_url(self) -> str:
        url = self.direct_url or self.database_url
        if not url.startswith("postgres"):
            raise RuntimeError(
                "Set DIRECT_URL or DATABASE_URL (Postgres) — SQLite is removed"
            )
        return url

    def require_database_url(self) -> str:
        if not self.database_url.startswith("postgres"):
            raise RuntimeError(
                "DATABASE_URL is required for application-svc (Postgres only; see docs/CONFIG.md)"
            )
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
