"""Goal tree: Goal -> Milestone -> Task, plus challenge templates."""

from django.db import models

from apps.common.enums import DimensionKey, GoalStatus, Priority, TaskStatus
from apps.common.models import OwnedModel, TimestampedModel


class Goal(OwnedModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    dimension = models.CharField(max_length=16, choices=DimensionKey.choices)
    priority = models.CharField(
        max_length=8, choices=Priority.choices, default=Priority.MEDIUM
    )
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=GoalStatus.choices, default=GoalStatus.ACTIVE
    )
    # Set when the goal was instantiated from a ChallengeTemplate.
    source_template = models.ForeignKey(
        "goals.ChallengeTemplate",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="goals",
    )

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "dimension"]),
        ]

    def __str__(self) -> str:
        return self.title


class Milestone(OwnedModel):
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=255)
    due_date = models.DateField(null=True, blank=True)
    sort_order = models.IntegerField(default=0)
    status = models.CharField(
        max_length=16, choices=GoalStatus.choices, default=GoalStatus.ACTIVE
    )

    class Meta:
        ordering = ("sort_order", "id")
        indexes = [models.Index(fields=["user", "goal"])]

    def __str__(self) -> str:
        return self.title


class Task(OwnedModel):
    goal = models.ForeignKey(
        Goal, null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks"
    )
    milestone = models.ForeignKey(
        Milestone,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tasks",
    )
    title = models.CharField(max_length=255)
    date = models.DateField()
    priority = models.CharField(
        max_length=8, choices=Priority.choices, default=Priority.MEDIUM
    )
    status = models.CharField(
        max_length=16, choices=TaskStatus.choices, default=TaskStatus.PENDING
    )
    sort_order = models.IntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("sort_order", "id")
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self) -> str:
        return self.title


class ChallengeTemplate(TimestampedModel):
    """Reusable challenge blueprint; `schedule` drives instantiation."""

    title_uz = models.CharField(max_length=255)
    description_uz = models.TextField(blank=True)
    dimension = models.CharField(max_length=16, choices=DimensionKey.choices)
    duration_days = models.IntegerField()
    # {"milestones": [{"title": str, "day": int}],
    #  "daily_tasks": [{"title": str, "priority": str, "days": [int] | "all"}]}
    schedule = models.JSONField(default=dict)
    is_builtin = models.BooleanField(default=False)
    slug = models.SlugField(max_length=64, unique=True)

    class Meta:
        ordering = ("id",)

    def __str__(self) -> str:
        return self.title_uz
