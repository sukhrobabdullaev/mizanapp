"""Root URL configuration for the Mizan API."""

from django.contrib import admin
from django.urls import include, path

from apps.accounts.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.goals.urls")),
    path("api/", include("apps.prayers.urls")),
    path("api/", include("apps.finance.urls")),
    path("api/", include("apps.mizan.urls")),
]
