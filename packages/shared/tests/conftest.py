from unittest.mock import AsyncMock

import pytest

from aulacys.config import get_settings


@pytest.fixture(autouse=True)
def disable_openai_for_tests(monkeypatch):
    """Never let a local .env key make tests call the network."""
    monkeypatch.setenv("OPENAI_API_KEY", "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def mock_llm():
    """Mock LLM to avoid calling OpenAI during tests."""
    mock = AsyncMock()
    mock.ainvoke.return_value = AsyncMock(content="Mocked LLM response")
    return mock
