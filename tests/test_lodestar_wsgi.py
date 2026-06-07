"""Unit tests for the native WSGI (Flask) app used in shared-hosting deploys."""

from pathlib import Path

import pytest

from lodestar.safety import PII_BLOCK_DETAIL

pytest.importorskip("flask")

from lodestar.wsgi import app  # noqa: E402

_FAVICON = Path(__file__).parents[1] / "src" / "lodestar" / "static" / "favicon.ico"


@pytest.fixture
def client():
    app.config.update(TESTING=True)
    return app.test_client()


@pytest.mark.unit
def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "ok"}


@pytest.mark.unit
def test_index_serves_html(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"<" in resp.data


@pytest.mark.unit
def test_chat_offline_mock_returns_reply(client):
    resp = client.post("/api/chat", json={"message": "scholarships for first-gen"})
    assert resp.status_code == 200
    assert "reply" in resp.get_json()


@pytest.mark.unit
def test_chat_rejects_empty_message(client):
    resp = client.post("/api/chat", json={"message": ""})
    assert resp.status_code == 400


@pytest.mark.unit
def test_chat_blocks_pii(client):
    resp = client.post("/api/chat", json={"message": "my email is jane@example.com"})
    assert resp.status_code == 400
    assert resp.get_json()["detail"] == PII_BLOCK_DETAIL


@pytest.mark.unit
@pytest.mark.skipif(not _FAVICON.exists(), reason="favicon asset not generated yet")
def test_favicon_served(client):
    resp = client.get("/favicon.ico")
    assert resp.status_code == 200
