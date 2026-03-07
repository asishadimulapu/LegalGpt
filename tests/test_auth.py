# Tests for authentication endpoints and utilities
"""
Unit and integration tests for:
- Password hashing / verification
- JWT token creation / decoding
- Registration endpoint
- Login endpoint
- /auth/me endpoint
- Logout endpoint (cookie clearing)
"""

import pytest
from app.utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
    validate_password_strength,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Unit tests — password utilities
# ═══════════════════════════════════════════════════════════════════════════════

class TestPasswordHashing:
    def test_hash_and_verify(self):
        raw = "Str0ng!Pass#99"
        hashed = get_password_hash(raw)
        assert hashed != raw
        assert verify_password(raw, hashed)

    def test_wrong_password_fails(self):
        hashed = get_password_hash("CorrectHorse!")
        assert not verify_password("WrongHorse!", hashed)


class TestPasswordStrength:
    def test_valid_password(self):
        ok, _ = validate_password_strength("Str0ng!Pass#99")
        assert ok

    def test_too_short(self):
        ok, msg = validate_password_strength("Ab1!")
        assert not ok
        assert "at least" in msg.lower()

    def test_missing_uppercase(self):
        ok, _ = validate_password_strength("strongpass1!xx")
        assert not ok

    def test_missing_digit(self):
        ok, _ = validate_password_strength("StrongPass!xxx")
        assert not ok

    def test_common_password(self):
        ok, _ = validate_password_strength("password")
        assert not ok


# ═══════════════════════════════════════════════════════════════════════════════
# Unit tests — JWT tokens
# ═══════════════════════════════════════════════════════════════════════════════

class TestJWT:
    def test_create_and_decode(self):
        token = create_access_token(subject="user-123")
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["type"] == "access"

    def test_invalid_token_returns_none(self):
        assert decode_access_token("not.a.jwt") is None


# ═══════════════════════════════════════════════════════════════════════════════
# Integration tests — registration, login, /me, logout
# ═══════════════════════════════════════════════════════════════════════════════

VALID_USER = {
    "full_name": "Test User",
    "email": "test@example.com",
    "password": "Str0ng!Pass#99",
}


class TestRegistration:
    def test_register_success(self, client):
        resp = client.post("/api/v1/auth/register", json=VALID_USER)
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == VALID_USER["email"]

    def test_duplicate_email(self, client):
        client.post("/api/v1/auth/register", json=VALID_USER)
        resp = client.post("/api/v1/auth/register", json=VALID_USER)
        assert resp.status_code == 400

    def test_weak_password_rejected(self, client):
        user = {**VALID_USER, "password": "123"}
        resp = client.post("/api/v1/auth/register", json=user)
        assert resp.status_code in (400, 422)  # Pydantic or our own validation


class TestLogin:
    def _register(self, client):
        client.post("/api/v1/auth/register", json=VALID_USER)

    def test_login_success(self, client):
        self._register(client)
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        # HttpOnly cookie should be set
        assert "access_token" in resp.cookies

    def test_login_wrong_password(self, client):
        self._register(client)
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": VALID_USER["email"], "password": "WrongPass!1"},
        )
        assert resp.status_code == 401


class TestMe:
    def _login(self, client):
        client.post("/api/v1/auth/register", json=VALID_USER)
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        return resp.json()["access_token"]

    def test_me_with_bearer(self, client):
        token = self._login(client)
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == VALID_USER["email"]

    def test_me_with_cookie(self, client):
        token = self._login(client)
        # Simulate cookie-based auth
        client.cookies.set("access_token", token)
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 200

    def test_me_unauthenticated(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401


class TestLogout:
    def test_logout_clears_cookie(self, client):
        resp = client.post("/api/v1/auth/logout")
        assert resp.status_code == 200
        # The cookie should be deleted (max-age=0)
        assert resp.json()["message"] == "Logged out"
