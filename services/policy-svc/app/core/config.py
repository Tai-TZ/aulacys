"""Env-driven settings for policy-svc."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    rules_dir: Path = Path(__file__).resolve().parents[2] / "rules"
    service_name: str = "policy-svc"
    version: str = "0.1.0"


@lru_cache
def get_settings() -> Settings:
    return Settings()
