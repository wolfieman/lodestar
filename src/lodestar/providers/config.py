"""Select the LLM provider from the environment.

``TEST_MODE`` (default on) → offline ``MockProvider``. Otherwise ``LODESTAR_PROVIDER``
(default ``anthropic``) selects the provider; ``LODESTAR_MODEL`` sets the model.
"""

from __future__ import annotations

import os

from lodestar.providers.base import LLMProvider

_TRUTHY = {"1", "true", "yes", "on"}


def env_test_mode() -> bool:
    """Whether TEST_MODE is enabled (default: on)."""
    return os.getenv("TEST_MODE", "true").strip().lower() in _TRUTHY


def get_provider(test_mode: bool | None = None) -> LLMProvider:
    """Return the configured provider (offline mock when TEST_MODE)."""
    if test_mode is None:
        test_mode = env_test_mode()
    if test_mode:
        from lodestar.providers.mock import MockProvider

        return MockProvider()
    name = os.getenv("LODESTAR_PROVIDER", "anthropic").strip().lower()
    if name == "openai":
        from lodestar.providers.openai import OpenAIProvider

        return OpenAIProvider()
    from lodestar.providers.anthropic import AnthropicProvider

    return AnthropicProvider()
