"""Review, score, streak and heatmap endpoint tests."""

from datetime import date, timedelta
from typing import Any

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.goals.models import Goal, Task
from apps.mizan.models import Review
from apps.mizan.scoring import activity_ratios, blended_ratios, prayer_ratio
from apps.prayers.models import Prayer

pytestmark = pytest.mark.django_db


def full_answers(score: int = 3) -> dict[str, Any]:
    return {
        key: {"score": score, "note": ""}
        for key in ("ruhiy", "jismoniy", "moliyaviy", "ijtimoiy", "ilmiy")
    }


@pytest.fixture
def monday() -> date:
    today = timezone.localdate()
    return today - timedelta(days=today.weekday())


class TestReviews:
    def test_requires_auth(self, api: APIClient) -> None:
        assert api.get("/api/reviews/").status_code == 401

    def test_create_computes_score(self, auth_api: APIClient, monday: date) -> None:
        response = auth_api.post(
            "/api/reviews/",
            {"week_start": monday.isoformat(), "answers": full_answers(4)},
            format="json",
        )
        assert response.status_code == 201
        assert isinstance(response.data["mizan_score"], int)
        assert 0 <= response.data["mizan_score"] <= 100

    def test_rejects_non_monday(self, auth_api: APIClient, monday: date) -> None:
        response = auth_api.post(
            "/api/reviews/",
            {"week_start": (monday + timedelta(days=1)).isoformat(), "answers": full_answers()},
            format="json",
        )
        assert response.status_code == 400

    def test_rejects_missing_dimension(self, auth_api: APIClient, monday: date) -> None:
        answers = full_answers()
        del answers["ilmiy"]
        response = auth_api.post(
            "/api/reviews/",
            {"week_start": monday.isoformat(), "answers": answers},
            format="json",
        )
        assert response.status_code == 400

    @pytest.mark.parametrize("score", [0, 6, "yaxshi", None])
    def test_rejects_out_of_range_score(
        self, auth_api: APIClient, monday: date, score: Any
    ) -> None:
        answers = full_answers()
        answers["ruhiy"] = {"score": score}
        response = auth_api.post(
            "/api/reviews/",
            {"week_start": monday.isoformat(), "answers": answers},
            format="json",
        )
        assert response.status_code == 400

    def test_rejects_duplicate_week(self, auth_api: APIClient, monday: date) -> None:
        payload = {"week_start": monday.isoformat(), "answers": full_answers()}
        assert auth_api.post("/api/reviews/", payload, format="json").status_code == 201
        assert auth_api.post("/api/reviews/", payload, format="json").status_code == 400

    def test_filter_by_week(self, auth_api: APIClient, monday: date) -> None:
        auth_api.post(
            "/api/reviews/",
            {"week_start": monday.isoformat(), "answers": full_answers()},
            format="json",
        )
        hit = auth_api.get(f"/api/reviews/?week={monday.isoformat()}")
        miss = auth_api.get(f"/api/reviews/?week={(monday - timedelta(days=7)).isoformat()}")
        assert len(hit.data) == 1
        assert miss.data == []

    def test_week_filter_accepts_any_day_of_that_week(
        self, auth_api: APIClient, monday: date
    ) -> None:
        auth_api.post(
            "/api/reviews/",
            {"week_start": monday.isoformat(), "answers": full_answers()},
            format="json",
        )
        response = auth_api.get(f"/api/reviews/?week={(monday + timedelta(days=3)).isoformat()}")
        assert len(response.data) == 1

    def test_isolated_between_users(
        self, auth_api: APIClient, other_api: APIClient, monday: date
    ) -> None:
        auth_api.post(
            "/api/reviews/",
            {"week_start": monday.isoformat(), "answers": full_answers()},
            format="json",
        )
        assert other_api.get("/api/reviews/").data == []

    def test_same_week_allowed_for_different_users(
        self, auth_api: APIClient, other_api: APIClient, monday: date
    ) -> None:
        payload = {"week_start": monday.isoformat(), "answers": full_answers()}
        assert auth_api.post("/api/reviews/", payload, format="json").status_code == 201
        assert other_api.post("/api/reviews/", payload, format="json").status_code == 201


class TestScoreEndpoint:
    def test_zero_activity_scores_zero(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/mizan/score/")
        assert response.status_code == 200
        assert response.data["score"] == 0
        assert response.data["has_review"] is False

    def test_reflects_task_completion(
        self, auth_api: APIClient, user: User, monday: date
    ) -> None:
        for dimension in ("ruhiy", "jismoniy", "moliyaviy", "ijtimoiy", "ilmiy"):
            goal = Goal.objects.create(user=user, title=dimension, dimension=dimension)
            Task.objects.create(
                user=user, goal=goal, title="t", date=monday, status="done"
            )
        response = auth_api.get("/api/mizan/score/")
        assert response.data["score"] > 0
        assert response.data["radar"]["ilmiy"] == 1.0

    def test_weakest_dimension_surfaced(
        self, auth_api: APIClient, user: User, monday: date
    ) -> None:
        strong = Goal.objects.create(user=user, title="s", dimension="ilmiy")
        weak = Goal.objects.create(user=user, title="w", dimension="jismoniy")
        Task.objects.create(user=user, goal=strong, title="a", date=monday, status="done")
        Task.objects.create(user=user, goal=weak, title="b", date=monday, status="pending")
        assert auth_api.get("/api/mizan/score/").data["weakest"] in {
            "jismoniy",
            "moliyaviy",
            "ijtimoiy",
            "ruhiy",
        }

    def test_review_marks_has_review(self, auth_api: APIClient, monday: date) -> None:
        auth_api.post(
            "/api/reviews/",
            {"week_start": monday.isoformat(), "answers": full_answers(5)},
            format="json",
        )
        response = auth_api.get("/api/mizan/score/")
        assert response.data["has_review"] is True
        assert response.data["score"] > 0

    def test_trend_against_previous_week(
        self, auth_api: APIClient, user: User, monday: date
    ) -> None:
        Review.objects.create(
            user=user,
            week_start=monday - timedelta(days=7),
            answers=full_answers(1),
            mizan_score=10,
        )
        auth_api.post(
            "/api/reviews/",
            {"week_start": monday.isoformat(), "answers": full_answers(5)},
            format="json",
        )
        response = auth_api.get("/api/mizan/score/")
        assert response.data["trend"] is not None

    def test_trend_is_none_without_history(self, auth_api: APIClient) -> None:
        assert auth_api.get("/api/mizan/score/").data["trend"] is None

    def test_rejects_bad_week_format(self, auth_api: APIClient) -> None:
        assert auth_api.get("/api/mizan/score/?week=nope").status_code == 400


class TestStreaksEndpoint:
    def test_empty(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/mizan/streaks/")
        assert response.data["prayers"] == {"current": 0, "longest": 0}
        assert response.data["tasks"] == {"current": 0, "longest": 0}

    def test_prayer_streak_counts_consecutive_days(
        self, auth_api: APIClient, user: User
    ) -> None:
        today = timezone.localdate()
        for offset in range(3):
            Prayer.objects.create(
                user=user, date=today - timedelta(days=offset), name="asr", status="done"
            )
        assert auth_api.get("/api/mizan/streaks/").data["prayers"]["current"] == 3

    def test_pending_tasks_break_the_streak(
        self, auth_api: APIClient, user: User
    ) -> None:
        today = timezone.localdate()
        Task.objects.create(user=user, title="a", date=today, status="pending")
        assert auth_api.get("/api/mizan/streaks/").data["tasks"]["current"] == 0

    def test_isolated_between_users(
        self, other_api: APIClient, user: User
    ) -> None:
        Prayer.objects.create(
            user=user, date=timezone.localdate(), name="asr", status="done"
        )
        assert other_api.get("/api/mizan/streaks/").data["prayers"]["current"] == 0


class TestHeatmapAndStats:
    def test_heatmap_shape(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/mizan/heatmap/")
        assert response.data["weeks"] == 12
        assert len(response.data["days"]) >= 7 * 11

    def test_stats_ratios(self, auth_api: APIClient, user: User) -> None:
        today = timezone.localdate()
        Task.objects.create(user=user, title="a", date=today, status="done")
        Task.objects.create(user=user, title="b", date=today, status="pending")
        response = auth_api.get("/api/mizan/stats/")
        assert response.data["tasks_total"] == 2
        assert response.data["tasks_ratio"] == 0.5

    def test_stats_empty_week(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/mizan/stats/")
        assert response.data["tasks_ratio"] == 0.0
        assert response.data["prayers_ratio"] == 0.0


class TestScoringHelpers:
    def test_prayer_ratio_none_when_nothing_logged(
        self, user: User, monday: date
    ) -> None:
        assert prayer_ratio(user, monday, monday + timedelta(days=6)) is None

    def test_partial_logging_cannot_reach_one(
        self, user: User, monday: date
    ) -> None:
        Prayer.objects.create(user=user, date=monday, name="asr", status="done")
        ratio = prayer_ratio(user, monday, monday + timedelta(days=6))
        assert ratio is not None
        assert ratio < 0.1

    def test_activity_ratios_cover_all_dimensions(
        self, user: User, monday: date
    ) -> None:
        ratios = activity_ratios(user, monday, monday + timedelta(days=6))
        assert set(ratios) == {"ruhiy", "jismoniy", "moliyaviy", "ijtimoiy", "ilmiy"}

    def test_blending_moves_toward_self_report(
        self, user: User, monday: date
    ) -> None:
        observed = blended_ratios(user, monday, None)
        blended = blended_ratios(user, monday, full_answers(5))
        assert blended["ilmiy"] > observed["ilmiy"]

    def test_tasks_without_goal_are_ignored(
        self, user: User, monday: date
    ) -> None:
        Task.objects.create(user=user, title="orphan", date=monday, status="done")
        ratios = activity_ratios(user, monday, monday + timedelta(days=6))
        assert all(value == 0.0 for value in ratios.values())
