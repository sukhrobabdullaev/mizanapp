"""Abstract base models shared across apps."""

from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.db import models

if TYPE_CHECKING:
    from django.db.models.manager import Manager


class OwnedQuerySet(models.QuerySet[Any]):
    def for_user(self, user: Any) -> "OwnedQuerySet":
        return self.filter(user=user)


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class OwnedModel(TimestampedModel):
    """Row belongs to exactly one user; every queryset must scope by it."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="%(class)ss",
    )

    objects: "Manager[Any]" = OwnedQuerySet.as_manager()

    class Meta:
        abstract = True
