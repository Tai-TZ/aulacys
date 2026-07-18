from langchain_openai import ChatOpenAI

from src.config import GEMINI_OPENAI_BASE_URL, get_settings


def get_llm() -> ChatOpenAI:
    """Return the configured chat model.

    Gemini is primary (OpenAI-compatible endpoint). OpenAI is the alternate
    when ``LLM_PROVIDER=openai``. Callers must only use this for prose specs —
    numbers/vetoes stay on the deterministic fallback path.
    """
    settings = get_settings()
    if settings.llm_provider == "gemini":
        return ChatOpenAI(
            model=settings.gemini_model_name,
            api_key=settings.active_gemini_key,
            base_url=GEMINI_OPENAI_BASE_URL,
            temperature=settings.llm_temperature,
        )
    return ChatOpenAI(
        model=settings.model_name,
        api_key=settings.openai_api_key,
        temperature=settings.llm_temperature,
    )
