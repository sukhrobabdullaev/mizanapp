"""Weekly muhosaba (reflection) reviews."""

from django.db import models

from apps.common.models import OwnedModel


class Review(OwnedModel):
    """One muhosaba per user per ISO week; `week_start` is always a Monday."""

    week_start = models.DateField()
    # {"ruhiy": {"score": 4, "note": ""}, ...} — score 1..5 per dimension
    answers = models.JSONField(default=dict)
    mizan_score = models.IntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "week_start"], name="uniq_review_per_user_week"
            )
        ]
        ordering = ("-week_start",)
        indexes = [models.Index(fields=["user", "week_start"])]

    def __str__(self) -> str:
        return f"Review({self.user_id}, {self.week_start})"
