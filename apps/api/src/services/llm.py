from langchain_openai import ChatOpenAI

from src.config import get_settings


def model_name_for_tier(tier: str | None = None) -> str:
    settings = get_settings()
    if tier == "strong":
        return settings.strong_model or settings.model_name
    if tier == "mini":
        return settings.mini_model or settings.model_name
    return settings.model_name


def get_llm(tier: str | None = None) -> ChatOpenAI:
    settings = get_settings()
    return ChatOpenAI(
        model=model_name_for_tier(tier),
        api_key=settings.openai_api_key,
        temperature=settings.llm_temperature,
    )
