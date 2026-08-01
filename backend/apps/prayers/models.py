"""Daily prayer log."""

from django.db import models

from apps.common.enums import PrayerName, PrayerStatus
from apps.common.models import OwnedModel


class Prayer(OwnedModel):
    date = models.DateField()
    name = models.CharField(max_length=16, choices=PrayerName.choices)
    status = models.CharField(max_length=16, choices=PrayerStatus.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date", "name"], name="uniq_prayer_per_user_date_name"
            )
        ]
        ordering = ("date", "id")
        indexes = [models.Index(fields=["user", "date"])]

    def __str__(self) -> str:
        return f"{self.date} {self.name}={self.status}"
