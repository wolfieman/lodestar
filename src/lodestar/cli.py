"""Command-line REPL for the Lodestar chatbot (``uv run lodestar``).

Reads ``.env`` for ``OPENAI_API_KEY`` and ``TEST_MODE``. With ``TEST_MODE=true`` the
chatbot runs offline with deterministic mock responses and needs no API key.
"""

from __future__ import annotations

import sys

from dotenv import load_dotenv

from lodestar.chatbot import Chatbot


def main() -> int:
    """Entry point registered as the ``lodestar`` console script."""
    load_dotenv()
    bot = Chatbot()
    mode = "offline mock" if bot.test_mode else f"live ({bot.model})"
    print(f"IgniteAI (Lodestar reference impl) — {mode}. Type 'quit' to exit.")
    try:
        while True:
            user = input("\nYou: ").strip()
            if user.lower() in {"quit", "exit", "bye"}:
                break
            if not user:
                continue
            print(f"\nIgniteAI: {bot.respond(user)}")
    except (EOFError, KeyboardInterrupt):
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
