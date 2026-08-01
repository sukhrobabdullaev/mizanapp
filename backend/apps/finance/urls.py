"""Finance routes."""

from rest_framework.routers import SimpleRouter

from apps.finance.views import CategoryViewSet, TransactionViewSet

router = SimpleRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("transactions", TransactionViewSet, basename="transaction")

urlpatterns = router.urls
