"""Pytest config: keep the test session offline and importable.

- Force ``TEST_MODE`` on (offline mock) by default so unit tests never hit a live API —
  even if a local ``.env`` sets ``TEST_MODE=false`` (web.py calls ``load_dotenv()`` on
  import). ``setdefault`` means integration runs that set ``TEST_MODE=false`` in the shell
  are still respected.
- Put the repo root on ``sys.path`` so the ``evals/`` ops package imports.
"""

import os
import sys
from pathlib import Path

os.environ.setdefault("TEST_MODE", "true")
sys.path.insert(0, str(Path(__file__).parent))
