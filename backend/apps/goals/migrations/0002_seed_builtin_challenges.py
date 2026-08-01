"""Seed (and keep in sync) the built-in challenge templates."""

from typing import Any

from django.db import migrations

from apps.goals.builtin_challenges import BUILTIN_CHALLENGES


def seed(apps: Any, schema_editor: Any) -> None:
    ChallengeTemplate = apps.get_model("goals", "ChallengeTemplate")
    for spec in BUILTIN_CHALLENGES:
        ChallengeTemplate.objects.update_or_create(
            slug=spec["slug"],
            defaults={**spec, "is_builtin": True},
        )


def unseed(apps: Any, schema_editor: Any) -> None:
    ChallengeTemplate = apps.get_model("goals", "ChallengeTemplate")
    ChallengeTemplate.objects.filter(
        slug__in=[spec["slug"] for spec in BUILTIN_CHALLENGES]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("goals", "0001_initial")]

    operations = [migrations.RunPython(seed, unseed)]
