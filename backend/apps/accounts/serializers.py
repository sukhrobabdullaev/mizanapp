"""Serializers for auth and profile endpoints."""

from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import Profile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer[AbstractBaseUser]):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name")
        read_only_fields = ("id", "username")


class RegisterSerializer(serializers.Serializer[AbstractBaseUser]):
    """Username + password registration. Email optional for v1."""

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Bu foydalanuvchi nomi band.")
        return value

    def validate_password(self, value: str) -> str:
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    @transaction.atomic
    def create(self, validated_data: dict[str, Any]) -> AbstractBaseUser:
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ProfileSerializer(serializers.ModelSerializer[Profile]):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", required=False, allow_blank=True)
    first_name = serializers.CharField(
        source="user.first_name", required=False, allow_blank=True, max_length=150
    )

    class Meta:
        model = Profile
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "location_lat",
            "location_lng",
            "location_name",
            "calc_method",
            "asr_madhab",
            "prayer_offsets",
            "hide_sadaqa",
            "notif_prefs",
            "onboarded_at",
        )
        read_only_fields = ("id", "username")

    def validate_prayer_offsets(self, value: Any) -> dict[str, int]:
        if not isinstance(value, dict):
            raise serializers.ValidationError("Obyekt bo'lishi kerak.")
        allowed = {"bomdod", "peshin", "asr", "shom", "xufton"}
        for key, offset in value.items():
            if key not in allowed:
                raise serializers.ValidationError(f"Noma'lum namoz: {key}")
            if not isinstance(offset, int) or isinstance(offset, bool):
                raise serializers.ValidationError(f"{key}: butun son bo'lishi kerak.")
            if abs(offset) > 60:
                raise serializers.ValidationError(f"{key}: -60..60 oralig'ida bo'lishi kerak.")
        return value

    def validate_notif_prefs(self, value: Any) -> dict[str, bool]:
        if not isinstance(value, dict):
            raise serializers.ValidationError("Obyekt bo'lishi kerak.")
        return value

    @transaction.atomic
    def update(self, instance: Profile, validated_data: dict[str, Any]) -> Profile:
        user_data = validated_data.pop("user", {})
        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save(update_fields=list(user_data.keys()))
        return super().update(instance, validated_data)
