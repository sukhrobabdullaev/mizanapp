"""Shared pytest fixtures."""

from typing import Any

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def user(db: Any) -> User:
    return User.objects.create_user(username="ali", password="Parol12345!")


@pytest.fixture
def other_user(db: Any) -> User:
    return User.objects.create_user(username="vali", password="Parol12345!")


def authenticate(client: APIClient, user: User) -> APIClient:
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.fixture
def auth_api(api: APIClient, user: User) -> APIClient:
    return authenticate(api, user)


@pytest.fixture
def other_api(other_user: User) -> APIClient:
    return authenticate(APIClient(), other_user)
