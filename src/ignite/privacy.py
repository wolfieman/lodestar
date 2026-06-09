"""Symmetric encryption helpers — a small FERPA/GDPR data-handling demonstration.

Illustrative, not a production data pipeline. See ``docs/privacy-policy.md``.

Copyright © 2026 Wolfgang Sanyer
Licensed under the Polyform Noncommercial License 1.0.0 (see LICENSE).
"""

from __future__ import annotations

from cryptography.fernet import Fernet


def generate_key() -> bytes:
    """Generate a new Fernet key."""
    return Fernet.generate_key()


def encrypt_message(key: bytes, message: str) -> bytes:
    """Encrypt a string with the given key, returning a Fernet token."""
    return Fernet(key).encrypt(message.encode("utf-8"))


def decrypt_message(key: bytes, token: bytes) -> str:
    """Decrypt a Fernet token with the given key, returning the original string."""
    return Fernet(key).decrypt(token).decode("utf-8")
