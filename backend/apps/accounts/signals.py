"""Keep a Profile row in lockstep with every User row."""

from typing import Any

from django.conf import settings
from django.db.models.base import Model
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import Profile


@receiver(post_save, sender=settings.AUTH_USER_MODEL, dispatch_uid="create_user_profile")
def create_user_profile(
    sender: type[Model], instance: Any, created: bool, **kwargs: Any
) -> None:
    if created:
        Profile.objects.get_or_create(user=instance)
