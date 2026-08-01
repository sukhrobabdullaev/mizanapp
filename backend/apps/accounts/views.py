"""Auth, profile and operational endpoints."""

from typing import Any

from django.db import DatabaseError, connection
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Profile
from apps.accounts.serializers import (
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.common.typing import current_user


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request: Request) -> Response:
    """Liveness probe that also verifies the Postgres connection."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError as exc:
        return Response({"status": "error", "database": str(exc)}, status=503)
    return Response({"status": "ok", "database": "ok"})


class RegisterView(generics.CreateAPIView[Any]):
    """Create an account and hand back a JWT pair immediately."""

    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ProfileView(generics.RetrieveUpdateAPIView[Profile]):
    """Read or patch the authenticated user's profile."""

    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    def get_object(self) -> Profile:
        profile, _ = Profile.objects.select_related("user").get_or_create(
            user=current_user(self.request)
        )
        return profile
