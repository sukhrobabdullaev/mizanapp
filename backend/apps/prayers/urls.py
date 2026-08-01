"""Prayer routes."""

from rest_framework.routers import SimpleRouter

from apps.prayers.views import PrayerTimesViewSet, PrayerViewSet

router = SimpleRouter()
router.register("prayers", PrayerViewSet, basename="prayer")
router.register("prayer-times", PrayerTimesViewSet, basename="prayer-times")

urlpatterns = router.urls
