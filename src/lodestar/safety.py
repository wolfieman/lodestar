"""Lightweight PII detection supporting the FERPA/GDPR no-PII posture.

Not a substitute for a full DLP pipeline — a pragmatic guard that lets the app avoid
soliciting or echoing obvious personal identifiers. See ``docs/security.md``.
"""

from __future__ import annotations

import re

_PATTERNS: dict[str, re.Pattern[str]] = {
    "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "email": re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"),
    "phone": re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
}

#: Exact user-facing message for the hosted-chat PII input gate. Parity-tested across
#: ports of the hosted tier — do not rephrase.
PII_BLOCK_DETAIL = (
    "That looks like it includes personal info (an email, phone number, or SSN). "
    "Lodestar never needs it — take it out and send again."
)


def detect_pii(text: str) -> list[str]:
    """Return the kinds of PII detected in ``text`` (empty list if none)."""
    return [kind for kind, pattern in _PATTERNS.items() if pattern.search(text)]


def contains_pii(text: str) -> bool:
    """Whether ``text`` appears to contain personal identifying information."""
    return bool(detect_pii(text))
