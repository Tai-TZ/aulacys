from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "App"
    app_env: Literal["development", "production", "test"] = "development"
    app_port: int = Field(default=8000, ge=1, le=65535)
    app_host: str = "0.0.0.0"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    cors_origins: str = "http://localhost:3000"

    # LLM
    # Pinned snapshot + temperature 0 so a decision is reproducible for audit (P0-3).
    # An unpinned alias silently drifts; temperature > 0 makes the same file score twice.
    openai_api_key: str = ""
    model_name: str = "gpt-4o-mini"
    strong_model: str = "gpt-4o-mini"
    mini_model: str = "gpt-4o-mini"
    llm_temperature: float = Field(default=0.0, ge=0.0, le=2.0)

    # Database — Supabase Postgres (see src/db/session.py, docs/DATABASE.md)
    # Runtime queries go through the transaction pooler (:6543, pgbouncer=true).
    # Empty string => DB layer disabled; app runs in-memory (demo-proof fallback).
    database_url: str = ""
    # Migrations only: session pooler (:5432). Alembic uses this, never the runtime URL.
    direct_url: str = ""

    @property
    def db_enabled(self) -> bool:
        return self.database_url.startswith("postgres")

    # Vector Store
    chroma_persist_dir: str = "./data/chroma"


@lru_cache
def get_settings() -> Settings:
    return Settings()
