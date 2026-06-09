"""Phusion Passenger / LiteSpeed LSAPI entrypoint for shared hosting (cPanel).

Serves the native WSGI app (Flask) from ``lodestar.wsgi`` — no ASGI bridge, which LSAPI
hangs on. In Setup Python App: startup file ``passenger_wsgi.py``, entry point
``application``; install deps from ``requirements-lean.txt``.

Copyright © 2026 Wolfgang Sanyer
Licensed under the Polyform Noncommercial License 1.0.0 (see LICENSE).
"""
# ruff: noqa: E402  (the sys.path bootstrap must run before importing the package)

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from lodestar.wsgi import app

application = app
