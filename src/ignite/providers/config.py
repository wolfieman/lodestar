"""Select the LLM provider from the environment.

``TEST_MODE`` (default on) → offline ``MockProvider``. Otherwise ``IGNITE_PROVIDER``
(default ``anthropic``) chooses the live provider; ``IGNITE_MODEL`` overrides the model.
"""

from __future__ import annotations

import os

from ignite.providers.base import LLMProvider

_TRUTHY = {"1", "true", "yes", "on"}


def env_test_mode() -> bool:
    """Whether TEST_MODE is enabled (default: on)."""
    return os.getenv("TEST_MODE", "true").strip().lower() in _TRUTHY


def get_provider(test_mode: bool | None = None) -> LLMProvider:
    """Return the configured provider (offline mock when TEST_MODE)."""
    if test_mode is None:
        test_mode = env_test_mode()
    if test_mode:
        from ignite.providers.mock import MockProvider

        return MockProvider()
    name = os.getenv("IGNITE_PROVIDER", "anthropic").strip().lower()
    if name == "openai":
        from ignite.providers.openai import OpenAIProvider

        return OpenAIProvider()
    from ignite.providers.anthropic import AnthropicProvider

    return AnthropicProvider()
