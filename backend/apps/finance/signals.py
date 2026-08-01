"""Seed each new user with a usable starting category set."""

from typing import Any

from django.conf import settings
from django.db.models.base import Model
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.finance.defaults import DEFAULT_CATEGORIES
from apps.finance.models import Category


@receiver(post_save, sender=settings.AUTH_USER_MODEL, dispatch_uid="seed_categories")
def seed_default_categories(
    sender: type[Model], instance: Any, created: bool, **kwargs: Any
) -> None:
    if not created:
        return
    Category.objects.bulk_create(
        [
            Category(user=instance, sort_order=index, **spec)
            for index, spec in enumerate(DEFAULT_CATEGORIES)
        ],
        ignore_conflicts=True,
    )
