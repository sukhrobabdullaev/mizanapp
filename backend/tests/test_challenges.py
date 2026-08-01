"""Challenge template and instantiation tests."""

from datetime import date, timedelta

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.goals.challenges import InvalidScheduleError, expand_days, instantiate_challenge
from apps.goals.models import ChallengeTemplate, Goal, Task

pytestmark = pytest.mark.django_db


class TestExpandDays:
    def test_all(self) -> None:
        assert expand_days("all", 3) == [1, 2, 3]

    def test_none_means_all(self) -> None:
        assert expand_days(None, 2) == [1, 2]

    def test_every_n(self) -> None:
        assert expand_days({"every": 3}, 10) == [1, 4, 7, 10]

    def test_explicit_list_clips_out_of_range(self) -> None:
        assert expand_days([1, 5, 99], 5) == [1, 5]

    def test_rejects_zero_step(self) -> None:
        with pytest.raises(InvalidScheduleError):
            expand_days({"every": 0}, 5)

    def test_rejects_non_integer_day(self) -> None:
        with pytest.raises(InvalidScheduleError):
            expand_days(["birinchi"], 5)

    def test_rejects_unknown_spec(self) -> None:
        with pytest.raises(InvalidScheduleError):
            expand_days(3.5, 5)


class TestBuiltinSeed:
    def test_three_builtins_exist(self) -> None:
        assert ChallengeTemplate.objects.filter(is_builtin=True).count() == 3

    def test_list_endpoint(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/challenges/")
        assert response.status_code == 200
        assert {c["slug"] for c in response.data} == {
            "40-kun-bomdod",
            "30-kun-kitobxonlik",
            "21-kun-sogliq",
        }

    def test_requires_auth(self, api: APIClient) -> None:
        assert api.get("/api/challenges/").status_code == 401


class TestStartChallenge:
    def test_creates_goal_tree(self, auth_api: APIClient) -> None:
        template = ChallengeTemplate.objects.get(slug="21-kun-sogliq")
        response = auth_api.post(
            f"/api/challenges/{template.pk}/start/",
            {"start_date": "2026-08-01"},
            format="json",
        )
        assert response.status_code == 201
        assert response.data["title"] == "21 kunlik sog'lom hayot"
        assert len(response.data["milestones"]) == 3
        # 3 daily tasks x 21 days
        assert response.data["task_count"] == 63

    def test_target_date_is_last_day(self, auth_api: APIClient) -> None:
        template = ChallengeTemplate.objects.get(slug="21-kun-sogliq")
        response = auth_api.post(
            f"/api/challenges/{template.pk}/start/",
            {"start_date": "2026-08-01"},
            format="json",
        )
        assert response.data["target_date"] == "2026-08-21"

    def test_defaults_to_today(self, auth_api: APIClient) -> None:
        template = ChallengeTemplate.objects.get(slug="21-kun-sogliq")
        response = auth_api.post(f"/api/challenges/{template.pk}/start/", {}, format="json")
        assert response.status_code == 201

    def test_every_n_task_spacing(self, auth_api: APIClient, user: User) -> None:
        template = ChallengeTemplate.objects.get(slug="30-kun-kitobxonlik")
        auth_api.post(
            f"/api/challenges/{template.pk}/start/",
            {"start_date": "2026-08-01"},
            format="json",
        )
        notes = Task.objects.filter(
            user=user, title="O'qiganlardan qisqacha yozib qo'yish"
        ).order_by("date")
        assert notes.count() == 10
        assert notes[1].date - notes[0].date == timedelta(days=3)

    def test_tasks_belong_to_caller(
        self, auth_api: APIClient, user: User, other_user: User
    ) -> None:
        template = ChallengeTemplate.objects.get(slug="21-kun-sogliq")
        auth_api.post(f"/api/challenges/{template.pk}/start/", {}, format="json")
        assert not Task.objects.filter(user=other_user).exists()
        assert Task.objects.filter(user=user).exists()

    def test_tasks_attach_to_nearest_earlier_milestone(
        self, auth_api: APIClient, user: User
    ) -> None:
        template = ChallengeTemplate.objects.get(slug="21-kun-sogliq")
        auth_api.post(
            f"/api/challenges/{template.pk}/start/",
            {"start_date": "2026-08-01"},
            format="json",
        )
        day_10 = Task.objects.filter(user=user, date=date(2026, 8, 10)).first()
        assert day_10 is not None
        assert day_10.milestone is not None
        assert day_10.milestone.title == "Ikkinchi hafta"

    def test_goal_links_back_to_template(
        self, auth_api: APIClient, user: User
    ) -> None:
        template = ChallengeTemplate.objects.get(slug="21-kun-sogliq")
        auth_api.post(f"/api/challenges/{template.pk}/start/", {}, format="json")
        assert Goal.objects.get(user=user).source_template_id == template.pk

    def test_rejects_bad_start_date(self, auth_api: APIClient) -> None:
        template = ChallengeTemplate.objects.get(slug="21-kun-sogliq")
        response = auth_api.post(
            f"/api/challenges/{template.pk}/start/",
            {"start_date": "kecha"},
            format="json",
        )
        assert response.status_code == 400

    def test_invalid_schedule_is_422_and_rolls_back(
        self, auth_api: APIClient, user: User
    ) -> None:
        broken = ChallengeTemplate.objects.create(
            slug="broken",
            title_uz="Buzuq",
            dimension="ruhiy",
            duration_days=5,
            schedule={"daily_tasks": [{"title": "x", "priority": "kosmik"}]},
        )
        response = auth_api.post(f"/api/challenges/{broken.pk}/start/", {}, format="json")
        assert response.status_code == 422
        assert not Goal.objects.filter(user=user).exists()


class TestInstantiateDirectly:
    def test_returns_saved_goal(self, user: User) -> None:
        template = ChallengeTemplate.objects.get(slug="40-kun-bomdod")
        goal = instantiate_challenge(template, date(2026, 8, 1), user)
        assert goal.pk is not None
        assert goal.tasks.count() == 80  # 2 daily tasks x 40 days

    def test_empty_schedule_creates_bare_goal(self, user: User) -> None:
        template = ChallengeTemplate.objects.create(
            slug="bosh", title_uz="Bo'sh", dimension="ilmiy", duration_days=3, schedule={}
        )
        goal = instantiate_challenge(template, date(2026, 8, 1), user)
        assert goal.tasks.count() == 0
        assert goal.milestones.count() == 0
