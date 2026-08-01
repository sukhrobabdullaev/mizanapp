"""Goal / milestone / task endpoint tests."""

from datetime import date

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.goals.models import Goal, Milestone, Task

pytestmark = pytest.mark.django_db


@pytest.fixture
def goal(user: User) -> Goal:
    return Goal.objects.create(user=user, title="Qur'on yodlash", dimension="ruhiy")


class TestGoalCrud:
    def test_requires_auth(self, api: APIClient) -> None:
        assert api.get("/api/goals/").status_code == 401

    def test_create_and_list(self, auth_api: APIClient) -> None:
        created = auth_api.post(
            "/api/goals/",
            {"title": "Sport", "dimension": "jismoniy", "priority": "high"},
            format="json",
        )
        assert created.status_code == 201
        listed = auth_api.get("/api/goals/")
        assert listed.status_code == 200
        assert [g["title"] for g in listed.data] == ["Sport"]

    def test_rejects_unknown_dimension(self, auth_api: APIClient) -> None:
        response = auth_api.post(
            "/api/goals/", {"title": "X", "dimension": "kosmik"}, format="json"
        )
        assert response.status_code == 400

    def test_patch_and_delete(self, auth_api: APIClient, goal: Goal) -> None:
        patched = auth_api.patch(
            f"/api/goals/{goal.pk}/", {"status": "done"}, format="json"
        )
        assert patched.status_code == 200
        assert patched.data["status"] == "done"
        assert auth_api.delete(f"/api/goals/{goal.pk}/").status_code == 204
        assert not Goal.objects.filter(pk=goal.pk).exists()

    def test_filter_by_status_and_dimension(
        self, auth_api: APIClient, user: User
    ) -> None:
        Goal.objects.create(user=user, title="A", dimension="ruhiy", status="active")
        Goal.objects.create(user=user, title="B", dimension="ilmiy", status="archived")
        assert len(auth_api.get("/api/goals/?status=active").data) == 1
        assert len(auth_api.get("/api/goals/?dimension=ilmiy").data) == 1

    def test_progress_reflects_done_tasks(
        self, auth_api: APIClient, user: User, goal: Goal
    ) -> None:
        Task.objects.create(
            user=user, goal=goal, title="1", date=date(2026, 1, 1), status="done"
        )
        Task.objects.create(
            user=user, goal=goal, title="2", date=date(2026, 1, 2), status="pending"
        )
        response = auth_api.get("/api/goals/")
        assert response.data[0]["progress"] == 0.5
        assert response.data[0]["task_count"] == 2
        assert response.data[0]["done_count"] == 1

    def test_progress_is_zero_without_tasks(
        self, auth_api: APIClient, goal: Goal
    ) -> None:
        assert auth_api.get("/api/goals/").data[0]["progress"] == 0.0


class TestGoalIsolation:
    def test_other_user_goal_is_not_listed(
        self, other_api: APIClient, goal: Goal
    ) -> None:
        assert other_api.get("/api/goals/").data == []

    def test_other_user_goal_detail_is_404(
        self, other_api: APIClient, goal: Goal
    ) -> None:
        assert other_api.get(f"/api/goals/{goal.pk}/").status_code == 404

    def test_other_user_cannot_patch(self, other_api: APIClient, goal: Goal) -> None:
        response = other_api.patch(
            f"/api/goals/{goal.pk}/", {"title": "o'g'irlangan"}, format="json"
        )
        assert response.status_code == 404
        goal.refresh_from_db()
        assert goal.title == "Qur'on yodlash"

    def test_other_user_cannot_delete(self, other_api: APIClient, goal: Goal) -> None:
        assert other_api.delete(f"/api/goals/{goal.pk}/").status_code == 404
        assert Goal.objects.filter(pk=goal.pk).exists()

    def test_create_ignores_spoofed_user_field(
        self, auth_api: APIClient, other_user: User
    ) -> None:
        response = auth_api.post(
            "/api/goals/",
            {"title": "Meniki", "dimension": "ruhiy", "user": other_user.pk},
            format="json",
        )
        assert response.status_code == 201
        assert Goal.objects.get(pk=response.data["id"]).user_id != other_user.pk


class TestMilestones:
    def test_create_and_list_under_goal(
        self, auth_api: APIClient, goal: Goal
    ) -> None:
        created = auth_api.post(
            f"/api/goals/{goal.pk}/milestones/",
            {"title": "1-juz", "sort_order": 1},
            format="json",
        )
        assert created.status_code == 201
        listed = auth_api.get(f"/api/goals/{goal.pk}/milestones/")
        assert [m["title"] for m in listed.data] == ["1-juz"]

    def test_patch_milestone(self, auth_api: APIClient, goal: Goal, user: User) -> None:
        milestone = Milestone.objects.create(user=user, goal=goal, title="1-juz")
        response = auth_api.patch(
            f"/api/milestones/{milestone.pk}/", {"status": "done"}, format="json"
        )
        assert response.status_code == 200
        assert response.data["status"] == "done"

    def test_add_task_to_milestone_inherits_goal(
        self, auth_api: APIClient, goal: Goal, user: User
    ) -> None:
        milestone = Milestone.objects.create(user=user, goal=goal, title="1-juz")
        response = auth_api.post(
            f"/api/milestones/{milestone.pk}/tasks/",
            {"title": "5 oyat", "date": "2026-02-01"},
            format="json",
        )
        assert response.status_code == 201
        assert response.data["goal"] == goal.pk
        assert response.data["milestone"] == milestone.pk

    def test_goal_detail_nests_milestones_and_tasks(
        self, auth_api: APIClient, goal: Goal, user: User
    ) -> None:
        milestone = Milestone.objects.create(user=user, goal=goal, title="1-juz")
        Task.objects.create(
            user=user, goal=goal, milestone=milestone, title="5 oyat", date=date(2026, 2, 1)
        )
        response = auth_api.get(f"/api/goals/{goal.pk}/")
        assert response.data["milestones"][0]["tasks"][0]["title"] == "5 oyat"

    def test_other_user_cannot_add_milestone(
        self, other_api: APIClient, goal: Goal
    ) -> None:
        response = other_api.post(
            f"/api/goals/{goal.pk}/milestones/", {"title": "x"}, format="json"
        )
        assert response.status_code == 404


class TestTasks:
    def test_filter_by_date(self, auth_api: APIClient, user: User) -> None:
        Task.objects.create(user=user, title="bugun", date=date(2026, 2, 1))
        Task.objects.create(user=user, title="ertaga", date=date(2026, 2, 2))
        response = auth_api.get("/api/tasks/?date=2026-02-01")
        assert [t["title"] for t in response.data] == ["bugun"]

    def test_ordered_by_priority(self, auth_api: APIClient, user: User) -> None:
        for title, priority in [("past", "low"), ("yuqori", "high"), ("orta", "medium")]:
            Task.objects.create(
                user=user, title=title, date=date(2026, 2, 1), priority=priority
            )
        response = auth_api.get("/api/tasks/?date=2026-02-01")
        assert [t["title"] for t in response.data] == ["yuqori", "orta", "past"]

    def test_completing_sets_completed_at(
        self, auth_api: APIClient, user: User
    ) -> None:
        task = Task.objects.create(user=user, title="t", date=date(2026, 2, 1))
        done = auth_api.patch(
            f"/api/tasks/{task.pk}/", {"status": "done"}, format="json"
        )
        assert done.data["completed_at"] is not None
        reopened = auth_api.patch(
            f"/api/tasks/{task.pk}/", {"status": "pending"}, format="json"
        )
        assert reopened.data["completed_at"] is None

    def test_cannot_attach_task_to_other_users_goal(
        self, auth_api: APIClient, other_user: User
    ) -> None:
        foreign = Goal.objects.create(user=other_user, title="X", dimension="ruhiy")
        response = auth_api.post(
            "/api/tasks/",
            {"title": "t", "date": "2026-02-01", "goal": foreign.pk},
            format="json",
        )
        assert response.status_code == 400

    def test_rejects_milestone_from_different_goal(
        self, auth_api: APIClient, user: User
    ) -> None:
        goal_a = Goal.objects.create(user=user, title="A", dimension="ruhiy")
        goal_b = Goal.objects.create(user=user, title="B", dimension="ilmiy")
        milestone_b = Milestone.objects.create(user=user, goal=goal_b, title="mb")
        response = auth_api.post(
            "/api/tasks/",
            {
                "title": "t",
                "date": "2026-02-01",
                "goal": goal_a.pk,
                "milestone": milestone_b.pk,
            },
            format="json",
        )
        assert response.status_code == 400

    def test_other_user_tasks_hidden(
        self, other_api: APIClient, user: User
    ) -> None:
        Task.objects.create(user=user, title="maxfiy", date=date(2026, 2, 1))
        assert other_api.get("/api/tasks/").data == []
