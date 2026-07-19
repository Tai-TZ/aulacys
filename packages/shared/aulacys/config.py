from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Gemini OpenAI-compatible API (no extra langchain package needed).
GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

def _resolve_repo_root() -> Path:
    """Monorepo root locally; package parent (/svc) inside Cloud Run images.

    Local: packages/shared/aulacys/config.py → parents[3] = repo root.
    Docker: /svc/aulacys/config.py is shallower — parents[3] raises IndexError.
    """
    here = Path(__file__).resolve()
    try:
        root = here.parents[3]
        if (root / "packages" / "shared" / "aulacys").is_dir():
            return root
    except IndexError:
        pass
    return here.parents[1]


_REPO_ROOT = _resolve_repo_root()


def _env_files() -> tuple[str, ...]:
    """Load cwd .env first, then the orchestrator-svc .env so any CWD still sees LLM keys."""
    candidates = [
        Path.cwd() / ".env",
        _REPO_ROOT / "services" / "orchestrator-svc" / ".env",
    ]
    seen: set[str] = set()
    files: list[str] = []
    for path in candidates:
        key = str(path.resolve()) if path.exists() else ""
        if key and key not in seen:
            seen.add(key)
            files.append(str(path))
    return tuple(files) or (".env",)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files(),
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

    # LLM — primary Gemini (TEAM_RULES 2026-07-18); OpenAI remains a switchable fallback.
    # Temperature 0 so a decision is reproducible for audit (P0-3).
    llm_provider: Literal["gemini", "openai"] = "gemini"
    llm_temperature: float = Field(default=0.0, ge=0.0, le=2.0)

    openai_api_key: str = ""
    # Custom OpenAI-compatible endpoint (empty ⇒ real OpenAI). Set for FPT AI Factory
    # or any gateway that speaks the OpenAI Chat Completions API.
    openai_base_url: str = ""
    model_name: str = "gpt-4o-mini"  # used when llm_provider=openai
    strong_model: str = "gpt-4o-mini"
    mini_model: str = "gpt-4o-mini"

    # Google AI Studio / Gemini — https://aistudio.google.com/apikey
    gemini_api_key: str = ""
    google_api_key: str = ""  # alias accepted in .env (GOOGLE_API_KEY)
    gemini_model_name: str = "gemini-3.1-flash-lite"

    # Database — Supabase Postgres (see src/db/session.py, docs/DATABASE.md)
    # Runtime queries go through the transaction pooler (:6543, pgbouncer=true).
    # Empty string => DB layer disabled; app runs in-memory (demo-proof fallback).
    database_url: str = ""
    # Migrations only: session pooler (:5432). Alembic uses this, never the runtime URL.
    direct_url: str = ""

    @property
    def db_enabled(self) -> bool:
        return self.database_url.startswith("postgres")

    @property
    def active_gemini_key(self) -> str:
        return self.gemini_api_key.strip() or self.google_api_key.strip()

    @property
    def llm_api_key(self) -> str:
        if self.llm_provider == "gemini":
            return self.active_gemini_key
        return self.openai_api_key.strip()

    @property
    def active_model_name(self) -> str:
        if self.llm_provider == "gemini":
            return self.gemini_model_name
        return self.model_name

    # Vector Store
    chroma_persist_dir: str = "./data/chroma"

    # Leaf services (empty ⇒ callers fall back / return empty)
    application_svc_url: str = "http://127.0.0.1:8360"


@lru_cache
def get_settings() -> Settings:
    return Settings()
