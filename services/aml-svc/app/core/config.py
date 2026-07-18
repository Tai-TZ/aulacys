from __future__ import annotations
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    seed_path: Path = Path(__file__).resolve().parents[2] / "seed" / "aml_lists.json"
    service_name: str = "aml-svc"
    version: str = "0.2.0"

@lru_cache
def get_settings() -> Settings:
    return Settings()
