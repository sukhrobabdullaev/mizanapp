"""Auth and profile routes."""

from dj_rest_auth.views import LoginView, LogoutView
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import ProfileView, RegisterView

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("profile/", ProfileView.as_view(), name="profile"),
]
