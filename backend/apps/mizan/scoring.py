"""Turn stored activity into the 0.0-1.0 dimension ratios the score needs.

Kept separate from `logic.py` so the maths stays DB-free and unit-testable;
this module is the only place that reads models.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date, timedelta
from typing import Any

from django.contrib.auth.models import User
from django.db.models import Count, Q

from apps.common.enums import DimensionKey, PrayerStatus, TaskStatus
from apps.goals.models import Task
from apps.mizan.logic import answers_to_ratios
from apps.prayers.models import Prayer

#: Prayers are the backbone of the spiritual dimension.
RUHIY_PRAYER_WEIGHT = 0.6


def task_ratios(user: User, start: date, end: date) -> dict[str, float]:
    """Per-dimension task completion ratio for [start, end]."""
    rows = (
        Task.objects.filter(user=user, date__gte=start, date__lte=end, goal__isnull=False)
        .values("goal__dimension")
        .annotate(
            total=Count("id"),
            done=Count("id", filter=Q(status=TaskStatus.DONE)),
        )
    )
    ratios: dict[str, float] = {}
    for row in rows:
        dimension = row["goal__dimension"]
        if not dimension or not row["total"]:
            continue
        ratios[dimension] = row["done"] / row["total"]
    return ratios


def prayer_ratio(user: User, start: date, end: date) -> float | None:
    """Share of logged prayers that were kept, or None when nothing is logged."""
    counts = Prayer.objects.filter(user=user, date__gte=start, date__lte=end).aggregate(
        total=Count("id"),
        kept=Count(
            "id",
            filter=Q(status__in=[PrayerStatus.DONE, PrayerStatus.EXCUSED]),
        ),
    )
    expected = ((end - start).days + 1) * 5
    if not counts["total"]:
        return None
    # Unlogged prayers count against the ratio so a single logged prayer
    # cannot produce a perfect spiritual score for the week.
    kept: int = counts["kept"]
    logged: int = counts["total"]
    return kept / max(logged, expected)


def activity_ratios(
    user: User, start: date, end: date
) -> dict[str, float]:
    """Observed behaviour per dimension, before any self-assessment blending."""
    ratios = dict.fromkeys(DimensionKey.values, 0.0)
    ratios.update(task_ratios(user, start, end))

    prayers = prayer_ratio(user, start, end)
    if prayers is not None:
        task_side = ratios[DimensionKey.RUHIY]
        ratios[DimensionKey.RUHIY] = (
            prayers * RUHIY_PRAYER_WEIGHT + task_side * (1 - RUHIY_PRAYER_WEIGHT)
        )
    return ratios


def blended_ratios(
    user: User,
    week_start: date,
    answers: Mapping[str, Any] | None = None,
) -> dict[str, float]:
    """Combine observed activity with the muhosaba self-assessment.

    Without a review the score is purely behavioural. With one, each dimension
    is the mean of what the user did and how they rated themselves — the app
    should reward honest reflection without letting it override the record.
    """
    week_end = week_start + timedelta(days=6)
    observed = activity_ratios(user, week_start, week_end)
    if not answers:
        return observed

    self_report = answers_to_ratios(answers)
    return {key: (observed[key] + self_report[key]) / 2 for key in observed}
