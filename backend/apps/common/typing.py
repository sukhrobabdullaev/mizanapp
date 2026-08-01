"""Typing helpers for DRF views.

Every view in this project sits behind ``IsAuthenticated``, so ``request.user``
is always a concrete ``User``. DRF still types it as ``User | AnonymousUser``;
these helpers narrow it once instead of scattering casts through the views.
"""

from typing import TYPE_CHECKING, cast

from rest_framework.request import Request

if TYPE_CHECKING:
    from django.contrib.auth.models import User


def current_user(request: Request) -> "User":
    """The authenticated user behind an ``IsAuthenticated`` view."""
    return cast("User", request.user)
