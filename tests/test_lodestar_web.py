"""Unit tests for the FastAPI web UI (offline, TEST_MODE mock)."""

import pytest
from fastapi.testclient import TestClient

from lodestar.safety import PII_BLOCK_DETAIL
from lodestar.web import app

client = TestClient(app)


@pytest.mark.unit
def test_health():
    assert client.get("/health").json() == {"status": "ok"}


@pytest.mark.unit
def test_index_served():
    resp = client.get("/")
    assert resp.status_code == 200
    assert "Lodestar" in resp.text


@pytest.mark.unit
def test_chat_endpoint_offline():
    resp = client.post("/api/chat", json={"message": "How do I write a strong resume?"})
    assert resp.status_code == 200
    assert resp.json()["reply"]


@pytest.mark.unit
def test_chat_blocks_pii():
    resp = client.post("/api/chat", json={"message": "my email is jane@example.com"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == PII_BLOCK_DETAIL
