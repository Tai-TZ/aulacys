from __future__ import annotations
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    service_name: str = "income-svc"
    version: str = "0.2.0"

@lru_cache
def get_settings() -> Settings:
    return Settings()
