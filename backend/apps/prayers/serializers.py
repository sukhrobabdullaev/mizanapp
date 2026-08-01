"""Serializers for prayer logging."""

from typing import Any

from rest_framework import serializers

from apps.common.enums import PrayerName, PrayerStatus
from apps.prayers.models import Prayer


class PrayerSerializer(serializers.ModelSerializer[Prayer]):
    class Meta:
        model = Prayer
        fields = ("id", "date", "name", "status")
        read_only_fields = ("id",)


class PrayerEntrySerializer(serializers.Serializer[dict[str, Any]]):
    name = serializers.ChoiceField(choices=PrayerName.choices)
    status = serializers.ChoiceField(choices=PrayerStatus.choices)


class PrayerBulkSerializer(serializers.Serializer[dict[str, Any]]):
    """Upsert every prayer of a single day in one round trip."""

    date = serializers.DateField()
    prayers = PrayerEntrySerializer(many=True)

    def validate_prayers(
        self, value: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        if not value:
            raise serializers.ValidationError("Bo'sh bo'lishi mumkin emas.")
        names = [entry["name"] for entry in value]
        if len(names) != len(set(names)):
            raise serializers.ValidationError("Har bir namoz bir marta bo'lishi kerak.")
        return value


class PrayerTimesQuerySerializer(serializers.Serializer[dict[str, Any]]):
    date = serializers.DateField(required=False)
    lat = serializers.FloatField(required=False, min_value=-90, max_value=90)
    lng = serializers.FloatField(required=False, min_value=-180, max_value=180)
