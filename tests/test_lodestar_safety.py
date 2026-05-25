"""Unit tests for PII detection (offline)."""

import pytest

from lodestar.safety import contains_pii, detect_pii


@pytest.mark.unit
def test_detects_common_pii():
    assert "ssn" in detect_pii("my ssn is 123-45-6789")
    assert "email" in detect_pii("reach me at student@example.edu")
    assert "phone" in detect_pii("call me at 919-555-1234")


@pytest.mark.unit
def test_clean_text_has_no_pii():
    assert detect_pii("How do I improve my resume?") == []
    assert not contains_pii("Tips for networking with alumni")
