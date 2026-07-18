"""Env-driven settings for catalog-svc."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    catalog_seed: Path = Path(__file__).resolve().parents[2] / "seed" / "catalog.json"
    service_name: str = "catalog-svc"
    version: str = "0.1.0"
    in_scope_only: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
