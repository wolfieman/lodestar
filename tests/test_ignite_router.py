"""Unit tests for the query router (offline, deterministic)."""

import pytest

from ignite.agents.router import route


@pytest.mark.unit
@pytest.mark.parametrize(
    "query,expected",
    [
        ("How do I improve my resume?", "resume"),
        ("Tips for a behavioral interview", "interview"),
        ("Find scholarships for STEM students", "scholarship"),
        ("Where are summer internships?", "internship"),
        ("How do I network on LinkedIn?", "networking"),
        ("Which courses should I take for my major?", "academic"),
        ("hello there", "general"),
    ],
)
def test_route_classifies(query: str, expected: str):
    assert route(query) == expected
