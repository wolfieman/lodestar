"""Command-line entry point for the Lodestar chatbot.

Scaffold stub. The full REPL — OpenAI ``gpt-4o-mini`` grounded on the knowledge base, with
a ``TEST_MODE`` offline mock — is implemented in Phase 3 (see ``docs/decisions.md``).
"""

from __future__ import annotations

import sys


def main() -> int:
    """Entry point registered as the ``lodestar`` console script."""
    print(
        "Lodestar scaffold — the IgniteAI reference implementation is not built yet "
        "(Phase 3). See docs/decisions.md."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
