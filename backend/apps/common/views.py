"""Shared view mixins."""

from typing import Any

from django.db.models import QuerySet
from rest_framework import viewsets

from apps.common.typing import current_user


class OwnedModelViewSet(viewsets.ModelViewSet[Any]):
    """ModelViewSet whose queryset is always scoped to `request.user`.

    Every concrete subclass sets `queryset`; this mixin guarantees no view can
    leak another user's rows, including on detail/PATCH/DELETE lookups.
    """

    def get_queryset(self) -> QuerySet[Any]:
        queryset: QuerySet[Any] = super().get_queryset()
        return queryset.filter(user=current_user(self.request))

    def perform_create(self, serializer: Any) -> None:
        serializer.save(user=current_user(self.request))
