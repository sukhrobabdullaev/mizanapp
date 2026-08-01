"""Serializers for weekly muhosaba reviews."""

from datetime import date
from typing import Any, cast

from rest_framework import serializers

from apps.common.enums import DimensionKey
from apps.mizan.models import Review


class ReviewSerializer(serializers.ModelSerializer[Review]):
    class Meta:
        model = Review
        fields = ("id", "week_start", "answers", "mizan_score", "created_at")
        read_only_fields = ("id", "mizan_score", "created_at")

    def validate_week_start(self, value: date) -> date:
        if value.weekday() != 0:
            raise serializers.ValidationError("Hafta boshi dushanba bo'lishi kerak.")
        return value

    def validate_answers(self, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise serializers.ValidationError("Obyekt bo'lishi kerak.")
        missing = [key for key in DimensionKey.values if key not in value]
        if missing:
            raise serializers.ValidationError(
                f"Yetishmayotgan yo'nalishlar: {', '.join(missing)}"
            )
        for key in DimensionKey.values:
            entry = value[key]
            score = entry.get("score") if isinstance(entry, dict) else entry
            if not isinstance(score, int) or isinstance(score, bool):
                raise serializers.ValidationError(f"{key}: 1-5 oralig'ida son kerak.")
            if not 1 <= score <= 5:
                raise serializers.ValidationError(f"{key}: 1-5 oralig'ida bo'lishi kerak.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        week_start: date | None = attrs.get("week_start") or getattr(
            self.instance, "week_start", None
        )
        if week_start is None:
            return attrs
        user = self.context["request"].user
        clash = Review.objects.filter(user=user, week_start=week_start)
        if self.instance is not None:
            clash = clash.exclude(pk=cast(Review, self.instance).pk)
        if clash.exists():
            raise serializers.ValidationError(
                {"week_start": "Bu hafta uchun muhosaba allaqachon mavjud."}
            )
        return attrs
