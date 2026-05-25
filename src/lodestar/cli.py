"""Command-line REPL for Lodestar (``uv run lodestar``).

Reads ``.env``. With ``TEST_MODE=true`` (default) it runs fully offline (mock provider +
hash embeddings). Set ``TEST_MODE=false`` and ``ANTHROPIC_API_KEY`` for live Claude.
"""

from __future__ import annotations

import sys

from dotenv import load_dotenv

from lodestar.safety import detect_pii


def main() -> int:
    """Entry point registered as the ``lodestar`` console script."""
    load_dotenv()
    from lodestar.app import build_agent
    from lodestar.providers.config import env_test_mode

    bot = build_agent()
    mode = "offline mock" if env_test_mode() else f"live ({bot.provider.model})"
    print(f"Lodestar (agentic) — {mode}. Type 'quit' to exit.")
    try:
        while True:
            user = input("\nYou: ").strip()
            if user.lower() in {"quit", "exit", "bye"}:
                break
            if not user:
                continue
            flagged = detect_pii(user)
            if flagged:
                print(
                    f"\n[notice] That may contain {', '.join(flagged)}. "
                    "Lodestar never needs personal identifiers — please omit them."
                )
            print(f"\nLodestar: {bot.run(user)}")
    except (EOFError, KeyboardInterrupt):
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
