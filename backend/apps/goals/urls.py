"""Goal tree routes."""

from rest_framework.routers import SimpleRouter

from apps.goals.views import (
    ChallengeTemplateViewSet,
    GoalViewSet,
    MilestoneViewSet,
    TaskViewSet,
)

router = SimpleRouter()
router.register("goals", GoalViewSet, basename="goal")
router.register("milestones", MilestoneViewSet, basename="milestone")
router.register("tasks", TaskViewSet, basename="task")
router.register("challenges", ChallengeTemplateViewSet, basename="challenge")

urlpatterns = router.urls
