"""Unit tests for the model-agnostic provider layer (offline)."""

import pytest

from lodestar.providers.base import LLMProvider
from lodestar.providers.config import get_provider
from lodestar.providers.mock import MockProvider


@pytest.mark.unit
def test_get_provider_test_mode_returns_mock():
    provider = get_provider(test_mode=True)
    assert isinstance(provider, MockProvider)
    assert isinstance(provider, LLMProvider)


@pytest.mark.unit
def test_mock_provider_signals_grounding():
    provider = MockProvider()
    msgs = [{"role": "user", "content": "hi"}]
    ungrounded = provider.complete("system only", msgs)
    grounded = provider.complete("...\nUse the following reference material:\n", msgs)
    assert "[ungrounded]" in ungrounded
    assert "[grounded]" in grounded
