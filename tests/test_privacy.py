"""Unit tests for the encryption helpers."""

import pytest

from lodestar.privacy import decrypt_message, encrypt_message, generate_key


@pytest.mark.unit
def test_encrypt_decrypt_roundtrip():
    key = generate_key()
    token = encrypt_message(key, "FERPA-protected note")
    assert decrypt_message(key, token) == "FERPA-protected note"


@pytest.mark.unit
def test_ciphertext_hides_plaintext():
    key = generate_key()
    token = encrypt_message(key, "secret")
    assert b"secret" not in token
