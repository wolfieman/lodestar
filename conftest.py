"""Pytest config: put the repo root on sys.path so the ``evals/`` ops package imports.

The ``ignite`` package is installed (editable); ``evals`` is a repo-root ops harness,
not part of the distribution, so tests need the repo root importable.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
