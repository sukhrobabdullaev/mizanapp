"""Instantiate a ChallengeTemplate into a real goal tree.

Lives here rather than in `mizan/logic.py` because it touches models; the
schedule-expansion maths it depends on stays pure and separately tested.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date, timedelta
from typing import Any

from django.contrib.auth.models import User
from django.db import transaction

from apps.common.enums import Priority
from apps.goals.models import ChallengeTemplate, Goal, Milestone, Task


class InvalidScheduleError(ValueError):
    """The template's `schedule` JSON cannot be expanded."""


def expand_days(spec: Any, duration_days: int) -> list[int]:
    """Resolve a daily-task `days` spec into 1-based day numbers.

    Accepts ``"all"``, an explicit list of day numbers, or ``{"every": n}``.
    Days outside 1..duration_days are dropped rather than silently shifting
    the whole challenge.
    """
    if spec in (None, "all"):
        return list(range(1, duration_days + 1))
    if isinstance(spec, dict) and "every" in spec:
        step = int(spec["every"])
        if step < 1:
            raise InvalidScheduleError("`every` must be >= 1")
        return list(range(1, duration_days + 1, step))
    if isinstance(spec, Sequence) and not isinstance(spec, str | bytes):
        days = []
        for raw in spec:
            if not isinstance(raw, int) or isinstance(raw, bool):
                raise InvalidScheduleError(f"Invalid day: {raw!r}")
            if 1 <= raw <= duration_days:
                days.append(raw)
        return days
    raise InvalidScheduleError(f"Unsupported days spec: {spec!r}")


@transaction.atomic
def instantiate_challenge(
    template: ChallengeTemplate, start_date: date, user: User
) -> Goal:
    """Create Goal + Milestones + Tasks from `template.schedule`.

    Returns the saved Goal. The whole tree is written in one transaction so a
    malformed schedule can never leave a half-built challenge behind.
    """
    schedule = template.schedule or {}
    if not isinstance(schedule, dict):
        raise InvalidScheduleError("schedule must be an object")

    goal = Goal.objects.create(
        user=user,
        title=template.title_uz,
        description=template.description_uz,
        dimension=template.dimension,
        priority=Priority.MEDIUM,
        target_date=start_date + timedelta(days=template.duration_days - 1),
        source_template=template,
    )

    milestones_by_day: dict[int, Milestone] = {}
    for index, spec in enumerate(schedule.get("milestones", [])):
        day = int(spec.get("day", 1))
        milestone = Milestone.objects.create(
            user=user,
            goal=goal,
            title=str(spec["title"]),
            due_date=start_date + timedelta(days=day - 1),
            sort_order=index,
        )
        milestones_by_day[day] = milestone

    def milestone_for(day: int) -> Milestone | None:
        """The most recent milestone at or before `day`."""
        candidates = [d for d in milestones_by_day if d <= day]
        return milestones_by_day[max(candidates)] if candidates else None

    tasks: list[Task] = []
    for order, spec in enumerate(schedule.get("daily_tasks", [])):
        priority = spec.get("priority", Priority.MEDIUM)
        if priority not in Priority.values:
            raise InvalidScheduleError(f"Unknown priority: {priority!r}")
        for day in expand_days(spec.get("days", "all"), template.duration_days):
            tasks.append(
                Task(
                    user=user,
                    goal=goal,
                    milestone=milestone_for(day),
                    title=str(spec["title"]),
                    date=start_date + timedelta(days=day - 1),
                    priority=priority,
                    sort_order=order,
                )
            )
    Task.objects.bulk_create(tasks)
    return goal
