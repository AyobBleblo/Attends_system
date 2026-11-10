"""
test_auth.py — Tests for JWT authentication endpoints.

Endpoints covered:
  POST /api/auth/login/    → TokenObtainPairView
  POST /api/auth/refresh/  → TokenRefreshView
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def plain_user(db):
    from django.contrib.auth.models import User
    return User.objects.create_user(username="authuser", password="securepass123")


# ─────────────────────────────────────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────────────────────────────────────

class TestLogin:

    def test_login_success(self, client, plain_user):
        """Valid credentials → 200 with both access and refresh tokens."""
        url = reverse("token_obtain_pair")
        res = client.post(url, {"username": "authuser", "password": "securepass123"})
        assert res.status_code == 200
        assert "access" in res.data
        assert "refresh" in res.data

    def test_login_wrong_password(self, client, plain_user):
        """Wrong password → 401 Unauthorized."""
        url = reverse("token_obtain_pair")
        res = client.post(url, {"username": "authuser", "password": "wrongpass"})
        assert res.status_code == 401

    def test_login_nonexistent_user(self, client, db):
        """Unknown username → 401 Unauthorized."""
        url = reverse("token_obtain_pair")
        res = client.post(url, {"username": "nobody", "password": "anything"})
        assert res.status_code == 401

    def test_login_missing_fields(self, client, db):
        """Empty body → 400 Bad Request."""
        url = reverse("token_obtain_pair")
        res = client.post(url, {})
        assert res.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# Token Refresh
# ─────────────────────────────────────────────────────────────────────────────

class TestTokenRefresh:

    def _get_refresh_token(self, client, plain_user):
        url = reverse("token_obtain_pair")
        res = client.post(url, {"username": "authuser", "password": "securepass123"})
        return res.data["refresh"]

    def test_token_refresh_success(self, client, plain_user):
        """Valid refresh token → 200 with a new access token."""
        refresh = self._get_refresh_token(client, plain_user)
        url = reverse("token_refresh")
        res = client.post(url, {"refresh": refresh})
        assert res.status_code == 200
        assert "access" in res.data

    def test_token_refresh_invalid(self, client, db):
        """Garbage refresh token → 401 Unauthorized."""
        url = reverse("token_refresh")
        res = client.post(url, {"refresh": "this.is.not.a.valid.token"})
        assert res.status_code == 401
