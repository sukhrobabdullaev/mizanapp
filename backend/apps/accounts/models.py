"""User profile model."""

from django.conf import settings
from django.db import models


class CalcMethod(models.TextChoices):
    """Prayer time calculation methods.

    Restricted to methods supported by *both* adhan-js (on-device) and adhanpy
    (server endpoint), so both paths agree to the minute.
    """

    MUSLIM_WORLD_LEAGUE = "MuslimWorldLeague", "Muslim World League"
    UMM_AL_QURA = "UmmAlQura", "Umm al-Qura"
    EGYPTIAN = "Egyptian", "Egyptian"
    KARACHI = "Karachi", "Karachi"
    DUBAI = "Dubai", "Dubai"
    QATAR = "Qatar", "Qatar"
    KUWAIT = "Kuwait", "Kuwait"
    SINGAPORE = "Singapore", "Singapore"
    MOONSIGHTING_COMMITTEE = "MoonsightingCommittee", "Moonsighting Committee"
    NORTH_AMERICA = "NorthAmerica", "North America"


class AsrMadhab(models.TextChoices):
    HANAFI = "Hanafi", "Hanafi"
    SHAFI = "Shafi", "Shafi"


class Profile(models.Model):
    """Per-user settings: location, prayer calculation, notification prefs."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
    location_name = models.CharField(max_length=120, blank=True)
    calc_method = models.CharField(
        max_length=32,
        choices=CalcMethod.choices,
        default=CalcMethod.MUSLIM_WORLD_LEAGUE,
    )
    asr_madhab = models.CharField(
        max_length=16,
        choices=AsrMadhab.choices,
        default=AsrMadhab.HANAFI,
    )
    # Per-prayer minute offsets, e.g. {"bomdod": 2, "asr": -1}
    prayer_offsets = models.JSONField(default=dict, blank=True)
    hide_sadaqa = models.BooleanField(default=False)
    # e.g. {"prayers": true, "tasks": true, "muhosaba": true}
    notif_prefs = models.JSONField(default=dict, blank=True)
    onboarded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_profile"

    def __str__(self) -> str:
        return f"Profile({self.user_id})"
