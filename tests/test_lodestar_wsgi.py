"""Unit tests for the native WSGI (Flask) app used in shared-hosting deploys."""

import pytest

pytest.importorskip("flask")

from lodestar.wsgi import app  # noqa: E402


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
