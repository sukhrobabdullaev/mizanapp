"""Serializers for the goal tree."""

from typing import Any

from django.db.models import Count, Q
from rest_framework import serializers

from apps.common.enums import TaskStatus
from apps.goals.models import ChallengeTemplate, Goal, Milestone, Task


class TaskSerializer(serializers.ModelSerializer[Task]):
    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "date",
            "priority",
            "status",
            "sort_order",
            "goal",
            "milestone",
            "completed_at",
        )
        read_only_fields = ("id", "completed_at")

    def validate_goal(self, value: Goal | None) -> Goal | None:
        self._check_owned(value)
        return value

    def validate_milestone(self, value: Milestone | None) -> Milestone | None:
        self._check_owned(value)
        return value

    def _check_owned(self, value: Goal | Milestone | None) -> None:
        if value is not None and value.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("Topilmadi.")

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        milestone = attrs.get("milestone") or getattr(self.instance, "milestone", None)
        goal = attrs.get("goal") or getattr(self.instance, "goal", None)
        if milestone is not None and goal is not None and milestone.goal_id != goal.id:
            raise serializers.ValidationError(
                {"milestone": "Bosqich tanlangan maqsadga tegishli emas."}
            )
        return attrs


class MilestoneSerializer(serializers.ModelSerializer[Milestone]):
    tasks = TaskSerializer(many=True, read_only=True)
    task_count = serializers.IntegerField(read_only=True)
    done_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Milestone
        fields = (
            "id",
            "goal",
            "title",
            "due_date",
            "sort_order",
            "status",
            "tasks",
            "task_count",
            "done_count",
        )
        read_only_fields = ("id", "goal")


class GoalSerializer(serializers.ModelSerializer[Goal]):
    task_count = serializers.IntegerField(read_only=True)
    done_count = serializers.IntegerField(read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields: tuple[str, ...] = (
            "id",
            "title",
            "description",
            "dimension",
            "priority",
            "target_date",
            "status",
            "source_template",
            "task_count",
            "done_count",
            "progress",
            "created_at",
        )
        read_only_fields = ("id", "source_template", "created_at")

    def get_progress(self, obj: Goal) -> float:
        total = getattr(obj, "task_count", None)
        done = getattr(obj, "done_count", None)
        if total is None or done is None:
            counts = obj.tasks.aggregate(
                total=Count("id"),
                done=Count("id", filter=Q(status=TaskStatus.DONE)),
            )
            total, done = counts["total"], counts["done"]
        return round(done / total, 4) if total else 0.0


class GoalDetailSerializer(GoalSerializer):
    milestones = MilestoneSerializer(many=True, read_only=True)

    class Meta(GoalSerializer.Meta):
        fields = (*GoalSerializer.Meta.fields, "milestones")


class ChallengeTemplateSerializer(serializers.ModelSerializer[ChallengeTemplate]):
    class Meta:
        model = ChallengeTemplate
        fields = (
            "id",
            "slug",
            "title_uz",
            "description_uz",
            "dimension",
            "duration_days",
            "schedule",
            "is_builtin",
        )


class StartChallengeSerializer(serializers.Serializer[dict[str, Any]]):
    start_date = serializers.DateField(required=False)
