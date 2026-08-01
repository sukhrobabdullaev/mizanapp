"""Mizan routes."""

from rest_framework.routers import SimpleRouter

from apps.mizan.views import MizanViewSet, ReviewViewSet

router = SimpleRouter()
router.register("reviews", ReviewViewSet, basename="review")
router.register("mizan", MizanViewSet, basename="mizan")

urlpatterns = router.urls
