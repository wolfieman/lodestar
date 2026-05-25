"""Command-line entry point for the IgniteAI rebuild (``uv run ignite``).

Scaffold stub. The agentic, RAG-grounded REPL is implemented in phases R1–R2
(see the plan and ``docs/roadmap.md``).
"""

from __future__ import annotations

import sys


def main() -> int:
    """Entry point registered as the ``ignite`` console script."""
    print(
        "IgniteAI rebuild scaffold — provider/RAG/agentic layers land in R1–R2. "
        "See docs/roadmap.md."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
