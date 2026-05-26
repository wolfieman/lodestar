"""Phusion Passenger entrypoint for Namecheap cPanel ("Setup Python App").

cPanel serves apps over WSGI (Passenger); Lodestar's web app is ASGI (FastAPI), so it is
wrapped with a2wsgi. In Setup Python App: set the startup file to ``passenger_wsgi.py``
and the entry point to ``application``; install deps from ``requirements.txt``.
"""
# ruff: noqa: E402, I001  (the sys.path bootstrap must run before importing the package)

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from a2wsgi import ASGIMiddleware
from lodestar.web import app

application = ASGIMiddleware(app)
