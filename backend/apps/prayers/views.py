"""Prayer log and prayer time endpoints."""

from typing import Any

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.accounts.models import Profile
from apps.common.typing import current_user
from apps.common.views import OwnedModelViewSet
from apps.prayers.models import Prayer
from apps.prayers.serializers import (
    PrayerBulkSerializer,
    PrayerSerializer,
    PrayerTimesQuerySerializer,
)
from apps.prayers.times import UnsupportedCalcMethodError, compute_prayer_times

#: Fallback when the user has not set a location yet (Toshkent).
DEFAULT_LAT = 41.2995
DEFAULT_LNG = 69.2401


class PrayerViewSet(OwnedModelViewSet):
    queryset = Prayer.objects.all()
    serializer_class = PrayerSerializer

    def get_queryset(self) -> QuerySet[Prayer]:
        qs: QuerySet[Prayer] = super().get_queryset()
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request: Request) -> Response:
        """Upsert a whole day's prayer statuses idempotently."""
        serializer = PrayerBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        day = serializer.validated_data["date"]
        entries = serializer.validated_data["prayers"]

        with transaction.atomic():
            for entry in entries:
                Prayer.objects.update_or_create(
                    user=current_user(request),
                    date=day,
                    name=entry["name"],
                    defaults={"status": entry["status"]},
                )
            saved = Prayer.objects.filter(user=current_user(request), date=day)
            data = PrayerSerializer(saved, many=True).data
        return Response(data, status=status.HTTP_200_OK)


class PrayerTimesViewSet(viewsets.ViewSet):
    """Read-only prayer times for a day, using the caller's profile settings."""

    def list(self, request: Request) -> Response:
        query = PrayerTimesQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        params: dict[str, Any] = query.validated_data

        profile, _ = Profile.objects.get_or_create(user=current_user(request))
        latitude = params.get("lat", profile.location_lat) or DEFAULT_LAT
        longitude = params.get("lng", profile.location_lng) or DEFAULT_LNG
        day = params.get("date") or timezone.localdate()

        try:
            times = compute_prayer_times(
                day=day,
                latitude=latitude,
                longitude=longitude,
                calc_method=profile.calc_method,
                madhab=profile.asr_madhab,
                offsets=profile.prayer_offsets,
            )
        except UnsupportedCalcMethodError:
            return Response(
                {"detail": "Hisoblash usuli qo'llab-quvvatlanmaydi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "date": day.isoformat(),
                "lat": latitude,
                "lng": longitude,
                "calc_method": profile.calc_method,
                "asr_madhab": profile.asr_madhab,
                "times": times,
            }
        )
