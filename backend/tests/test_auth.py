"""Auth + profile endpoint tests."""

from typing import Any

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.accounts.models import Profile

pytestmark = pytest.mark.django_db


class TestRegister:
    def test_returns_token_pair_and_creates_profile(self, api: APIClient) -> None:
        response = api.post(
            "/api/auth/register/",
            {"username": "yangi", "password": "Parol12345!", "first_name": "Yangi"},
        )
        assert response.status_code == 201
        assert set(response.data) == {"access", "refresh", "user"}
        assert response.data["user"]["username"] == "yangi"
        assert Profile.objects.filter(user__username="yangi").exists()

    def test_rejects_duplicate_username_case_insensitively(
        self, api: APIClient, user: User
    ) -> None:
        response = api.post("/api/auth/register/", {"username": "ALI", "password": "Parol12345!"})
        assert response.status_code == 400
        assert "username" in response.data

    def test_rejects_weak_password(self, api: APIClient) -> None:
        response = api.post("/api/auth/register/", {"username": "zaif", "password": "12345678"})
        assert response.status_code == 400
        assert "password" in response.data

    def test_password_is_hashed(self, api: APIClient) -> None:
        api.post("/api/auth/register/", {"username": "hash", "password": "Parol12345!"})
        created = User.objects.get(username="hash")
        assert created.password != "Parol12345!"
        assert created.check_password("Parol12345!")


class TestLogin:
    def test_returns_token_pair(self, api: APIClient, user: User) -> None:
        response = api.post("/api/auth/login/", {"username": "ali", "password": "Parol12345!"})
        assert response.status_code == 200
        assert response.data["access"]
        assert response.data["refresh"]

    def test_rejects_bad_password(self, api: APIClient, user: User) -> None:
        response = api.post("/api/auth/login/", {"username": "ali", "password": "notmypassword"})
        assert response.status_code == 400


class TestTokenRefresh:
    def test_refresh_issues_new_access_token(
        self, api: APIClient, user: User
    ) -> None:
        login = api.post("/api/auth/login/", {"username": "ali", "password": "Parol12345!"})
        response = api.post(
            "/api/auth/token/refresh/", {"refresh": login.data["refresh"]}
        )
        assert response.status_code == 200
        assert response.data["access"]

    def test_rejects_garbage_token(self, api: APIClient) -> None:
        response = api.post("/api/auth/token/refresh/", {"refresh": "not-a-token"})
        assert response.status_code == 401


class TestProfile:
    def test_requires_authentication(self, api: APIClient) -> None:
        assert api.get("/api/profile/").status_code == 401

    def test_returns_own_profile_with_defaults(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/profile/")
        assert response.status_code == 200
        assert response.data["username"] == "ali"
        assert response.data["calc_method"] == "MuslimWorldLeague"
        assert response.data["asr_madhab"] == "Hanafi"

    def test_patch_updates_fields(self, auth_api: APIClient) -> None:
        response = auth_api.patch(
            "/api/profile/",
            {
                "location_lat": 41.2995,
                "location_lng": 69.2401,
                "location_name": "Toshkent",
                "prayer_offsets": {"bomdod": 2},
                "notif_prefs": {"prayers": True},
                "first_name": "Ali",
            },
            format="json",
        )
        assert response.status_code == 200
        assert response.data["location_name"] == "Toshkent"
        assert response.data["prayer_offsets"] == {"bomdod": 2}
        assert response.data["first_name"] == "Ali"

    @pytest.mark.parametrize(
        "payload",
        [
            {"prayer_offsets": {"nomalum": 2}},
            {"prayer_offsets": {"bomdod": 999}},
            {"prayer_offsets": {"bomdod": "ikki"}},
            {"prayer_offsets": []},
        ],
    )
    def test_rejects_invalid_prayer_offsets(
        self, auth_api: APIClient, payload: dict[str, Any]
    ) -> None:
        response = auth_api.patch("/api/profile/", payload, format="json")
        assert response.status_code == 400

    def test_username_is_read_only(self, auth_api: APIClient) -> None:
        response = auth_api.patch("/api/profile/", {"username": "boshqa"}, format="json")
        assert response.status_code == 200
        assert response.data["username"] == "ali"

    def test_users_never_see_each_others_profile(
        self, auth_api: APIClient, other_api: APIClient
    ) -> None:
        auth_api.patch("/api/profile/", {"location_name": "Toshkent"}, format="json")
        response = other_api.get("/api/profile/")
        assert response.data["username"] == "vali"
        assert response.data["location_name"] == ""


class TestHealth:
    def test_health_is_public(self, api: APIClient) -> None:
        response = api.get("/api/health/")
        assert response.status_code == 200
        assert response.data == {"status": "ok", "database": "ok"}
