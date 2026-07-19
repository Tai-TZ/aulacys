from langchain_openai import ChatOpenAI

from aulacys.config import GEMINI_OPENAI_BASE_URL, get_settings


def model_name_for_tier(tier: str | None = None) -> str:
    """Resolve model id for a harness tier.

    When ``LLM_PROVIDER=gemini``, all tiers use ``gemini_model_name`` (single primary).
    OpenAI path keeps strong/mini/default from settings.
    """
    settings = get_settings()
    if settings.llm_provider == "gemini":
        return settings.gemini_model_name
    if tier == "strong":
        return settings.strong_model or settings.model_name
    if tier == "mini":
        return settings.mini_model or settings.model_name
    return settings.model_name


def get_llm(tier: str | None = None) -> ChatOpenAI:
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
        model=model_name_for_tier(tier),
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url or None,
        temperature=settings.llm_temperature,
    )
