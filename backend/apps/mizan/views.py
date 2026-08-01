"""Muhosaba reviews, Mizan score, streaks and heatmap."""

from datetime import date, timedelta
from typing import Any

from django.db.models import QuerySet
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.enums import TaskStatus
from apps.common.typing import current_user
from apps.common.views import OwnedModelViewSet
from apps.goals.models import Task
from apps.mizan.logic import (
    compute_mizan_score,
    compute_streak,
    heatmap_buckets,
    week_start_for,
)
from apps.mizan.models import Review
from apps.mizan.scoring import blended_ratios
from apps.mizan.serializers import ReviewSerializer
from apps.prayers.models import Prayer

HEATMAP_WEEKS = 12


def _parse_week(value: str | None, fallback: date) -> date:
    if not value:
        return week_start_for(fallback)
    try:
        return week_start_for(date.fromisoformat(value))
    except ValueError as exc:
        raise ValidationError({"week": "Format: YYYY-MM-DD"}) from exc


class ReviewViewSet(OwnedModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer

    def get_queryset(self) -> QuerySet[Review]:
        qs: QuerySet[Review] = super().get_queryset()
        week = self.request.query_params.get("week")
        if week:
            qs = qs.filter(week_start=_parse_week(week, timezone.localdate()))
        return qs

    def perform_create(self, serializer: Any) -> None:
        week_start = serializer.validated_data["week_start"]
        answers = serializer.validated_data["answers"]
        ratios = blended_ratios(current_user(self.request), week_start, answers)
        serializer.save(
            user=current_user(self.request), mizan_score=compute_mizan_score(ratios)["score"]
        )

    def perform_update(self, serializer: Any) -> None:
        instance = serializer.instance
        week_start = serializer.validated_data.get("week_start", instance.week_start)
        answers = serializer.validated_data.get("answers", instance.answers)
        ratios = blended_ratios(current_user(self.request), week_start, answers)
        serializer.save(mizan_score=compute_mizan_score(ratios)["score"])


class MizanViewSet(viewsets.ViewSet):
    """Derived analytics for the Mizan tab. Nothing here is stored."""

    @action(detail=False, methods=["get"], url_path="score")
    def score(self, request: Request) -> Response:
        today = timezone.localdate()
        week_start = _parse_week(request.query_params.get("week"), today)
        review = Review.objects.filter(
            user=current_user(request), week_start=week_start
        ).first()
        ratios = blended_ratios(
            current_user(request), week_start, review.answers if review else None
        )
        result = compute_mizan_score(ratios)

        previous = Review.objects.filter(
            user=current_user(request), week_start=week_start - timedelta(days=7)
        ).first()
        trend = (
            result["score"] - previous.mizan_score
            if previous and previous.mizan_score is not None
            else None
        )

        return Response(
            {
                "week_start": week_start.isoformat(),
                "score": result["score"],
                "weakest": result["weakest"],
                "radar": result["radar"],
                "trend": trend,
                "has_review": review is not None,
            }
        )

    @action(detail=False, methods=["get"], url_path="streaks")
    def streaks(self, request: Request) -> Response:
        today = timezone.localdate()
        window_start = today - timedelta(days=365)

        prayer_days = [
            {"date": row["date"], "status": row["status"]}
            for row in Prayer.objects.filter(
                user=current_user(request), date__gte=window_start, date__lte=today
            ).values("date", "status")
        ]
        task_days = [
            {"date": row["date"], "status": row["status"]}
            for row in Task.objects.filter(
                user=current_user(request), date__gte=window_start, date__lte=today
            ).values("date", "status")
        ]

        return Response(
            {
                "prayers": compute_streak(prayer_days, today=today),
                "tasks": compute_streak(
                    [
                        {
                            "date": row["date"],
                            "status": "done"
                            if row["status"] == TaskStatus.DONE
                            else "missed",
                        }
                        for row in task_days
                    ],
                    today=today,
                ),
            }
        )

    @action(detail=False, methods=["get"], url_path="heatmap")
    def heatmap(self, request: Request) -> Response:
        today = timezone.localdate()
        start = week_start_for(today) - timedelta(weeks=HEATMAP_WEEKS - 1)
        rows = [
            {"date": row["date"], "status": row["status"]}
            for row in Prayer.objects.filter(
                user=current_user(request), date__gte=start, date__lte=today
            ).values("date", "status")
        ]
        return Response(
            {
                "weeks": HEATMAP_WEEKS,
                "days": heatmap_buckets(rows, weeks=HEATMAP_WEEKS, today=today),
            }
        )

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request: Request) -> Response:
        """The 2x2 grid on the Mizan tab."""
        today = timezone.localdate()
        week_start = week_start_for(today)
        week_end = week_start + timedelta(days=6)

        tasks = Task.objects.filter(
            user=current_user(request), date__gte=week_start, date__lte=week_end
        )
        total = tasks.count()
        done = tasks.filter(status=TaskStatus.DONE).count()
        prayers = Prayer.objects.filter(
            user=current_user(request), date__gte=week_start, date__lte=week_end
        )
        prayers_total = prayers.count()
        prayers_kept = prayers.filter(status__in=["done", "excused"]).count()

        return Response(
            {
                "week_start": week_start.isoformat(),
                "tasks_total": total,
                "tasks_done": done,
                "tasks_ratio": round(done / total, 4) if total else 0.0,
                "prayers_total": prayers_total,
                "prayers_kept": prayers_kept,
                "prayers_ratio": round(prayers_kept / prayers_total, 4)
                if prayers_total
                else 0.0,
            },
            status=status.HTTP_200_OK,
        )
