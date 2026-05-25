"""Lightweight, deterministic keyword router that classifies a guidance query."""

from __future__ import annotations

CATEGORIES = (
    "resume",
    "interview",
    "scholarship",
    "internship",
    "networking",
    "academic",
    "general",
)

_KEYWORDS: dict[str, tuple[str, ...]] = {
    "resume": ("resume", "cv", "cover letter"),
    "interview": ("interview", "behavioral", "star method"),
    "scholarship": ("scholarship", "grant", "financial aid", "funding"),
    "internship": ("internship", "co-op", "co op"),
    "networking": ("network", "linkedin", "alumni", "mentor", "connect"),
    "academic": ("major", "course", "gpa", "class", "degree", "study"),
}


def route(query: str) -> str:
    """Return the most likely guidance category for a query (default: ``general``)."""
    text = query.lower()
    for category, keywords in _KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return category
    return "general"
