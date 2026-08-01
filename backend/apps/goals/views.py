"""Goal, milestone and task endpoints."""

from typing import Any

from django.db.models import Case, Count, IntegerField, Q, QuerySet, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.enums import Priority, TaskStatus
from apps.common.typing import current_user
from apps.common.views import OwnedModelViewSet
from apps.goals.challenges import InvalidScheduleError, instantiate_challenge
from apps.goals.models import ChallengeTemplate, Goal, Milestone, Task
from apps.goals.serializers import (
    ChallengeTemplateSerializer,
    GoalDetailSerializer,
    GoalSerializer,
    MilestoneSerializer,
    StartChallengeSerializer,
    TaskSerializer,
)

_TASK_COUNTS = {
    "task_count": Count("tasks", distinct=True),
    "done_count": Count(
        "tasks", filter=Q(tasks__status=TaskStatus.DONE), distinct=True
    ),
}


class GoalViewSet(OwnedModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer

    def get_queryset(self) -> QuerySet[Goal]:
        qs: QuerySet[Goal] = super().get_queryset().annotate(**_TASK_COUNTS)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        dimension = self.request.query_params.get("dimension")
        if dimension:
            qs = qs.filter(dimension=dimension)
        return qs

    def get_serializer_class(self) -> type[Any]:
        if self.action == "retrieve":
            return GoalDetailSerializer
        return GoalSerializer

    @action(detail=True, methods=["get", "post"], url_path="milestones")
    def milestones(self, request: Request, pk: str | None = None) -> Response:
        goal = self.get_object()
        if request.method == "GET":
            queryset = goal.milestones.annotate(**_TASK_COUNTS).prefetch_related("tasks")
            serializer = MilestoneSerializer(
                queryset, many=True, context=self.get_serializer_context()
            )
            return Response(serializer.data)

        serializer = MilestoneSerializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=current_user(request), goal=goal)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MilestoneViewSet(OwnedModelViewSet):
    queryset = Milestone.objects.all()
    serializer_class = MilestoneSerializer
    http_method_names = ["get", "patch", "delete", "head", "options", "post"]

    def get_queryset(self) -> QuerySet[Milestone]:
        qs: QuerySet[Milestone] = super().get_queryset()
        return qs.annotate(**_TASK_COUNTS).prefetch_related("tasks")

    @action(detail=True, methods=["post"], url_path="tasks")
    def tasks(self, request: Request, pk: str | None = None) -> Response:
        milestone = get_object_or_404(
            Milestone.objects.filter(user=current_user(request)), pk=pk
        )
        payload = {**request.data, "milestone": milestone.pk, "goal": milestone.goal_id}
        serializer = TaskSerializer(
            data=payload, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=current_user(request))
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TaskViewSet(OwnedModelViewSet):
    queryset = Task.objects.select_related("goal").all()
    serializer_class = TaskSerializer

    def get_queryset(self) -> QuerySet[Task]:
        qs: QuerySet[Task] = super().get_queryset()
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(date__lte=date_to)
        goal = self.request.query_params.get("goal")
        if goal:
            qs = qs.filter(goal_id=goal)
        # Bugun tab renders high -> medium -> low; keep ordering server-side.
        return qs.annotate(
            priority_rank=Case(
                When(priority=Priority.HIGH, then=0),
                When(priority=Priority.MEDIUM, then=1),
                default=2,
                output_field=IntegerField(),
            )
        ).order_by("priority_rank", "sort_order", "id")

    def perform_create(self, serializer: Any) -> None:
        completed_at = (
            timezone.now()
            if serializer.validated_data.get("status") == TaskStatus.DONE
            else None
        )
        serializer.save(user=current_user(self.request), completed_at=completed_at)

    def perform_update(self, serializer: Any) -> None:
        new_status = serializer.validated_data.get("status")
        if new_status is None:
            serializer.save()
            return
        was_done = serializer.instance.status == TaskStatus.DONE
        now_done = new_status == TaskStatus.DONE
        if now_done and not was_done:
            serializer.save(completed_at=timezone.now())
        elif was_done and not now_done:
            serializer.save(completed_at=None)
        else:
            serializer.save()


class ChallengeTemplateViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet[ChallengeTemplate],
):
    """Read-only challenge gallery plus the `start` action."""

    queryset = ChallengeTemplate.objects.all()
    serializer_class = ChallengeTemplateSerializer

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request: Request, pk: str | None = None) -> Response:
        template = self.get_object()
        payload = StartChallengeSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        start_date = payload.validated_data.get("start_date") or timezone.localdate()

        try:
            goal = instantiate_challenge(template, start_date, current_user(request))
        except InvalidScheduleError as exc:
            return Response(
                {"detail": f"Challenge jadvali noto'g'ri: {exc}"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        goal = Goal.objects.filter(pk=goal.pk).annotate(**_TASK_COUNTS).get()
        serializer = GoalDetailSerializer(goal, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_201_CREATED)
