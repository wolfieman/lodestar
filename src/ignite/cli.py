"""Command-line REPL for the IgniteAI reproduction (``uv run ignite``).

Reads ``.env``. ``TEST_MODE=true`` (default) runs offline; set ``TEST_MODE=false``
and ``OPENAI_API_KEY`` for live responses (the 2024 original was OpenAI-based).
"""

from __future__ import annotations

import sys

from dotenv import load_dotenv

from ignite.chatbot import Chatbot


def main() -> int:
    """Entry point registered as the ``ignite`` console script."""
    load_dotenv()
    bot = Chatbot()
    mode = "offline mock" if bot.test_mode else f"live ({bot.model})"
    print(f"IgniteAI (2024 reproduction) — {mode}. Type 'quit' to exit.")
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
