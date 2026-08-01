"""Prayer log and prayer time tests."""

from datetime import date

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.accounts.models import Profile
from apps.prayers.models import Prayer
from apps.prayers.times import UnsupportedCalcMethodError, compute_prayer_times

pytestmark = pytest.mark.django_db


class TestPrayerLog:
    def test_requires_auth(self, api: APIClient) -> None:
        assert api.get("/api/prayers/").status_code == 401

    def test_bulk_creates_all_five(self, auth_api: APIClient) -> None:
        response = auth_api.post(
            "/api/prayers/bulk/",
            {
                "date": "2026-07-31",
                "prayers": [
                    {"name": "bomdod", "status": "done"},
                    {"name": "peshin", "status": "done"},
                    {"name": "asr", "status": "missed"},
                    {"name": "shom", "status": "late"},
                    {"name": "xufton", "status": "excused"},
                ],
            },
            format="json",
        )
        assert response.status_code == 200
        assert len(response.data) == 5
        assert Prayer.objects.count() == 5

    def test_bulk_is_idempotent_upsert(self, auth_api: APIClient) -> None:
        payload = {
            "date": "2026-07-31",
            "prayers": [{"name": "bomdod", "status": "missed"}],
        }
        auth_api.post("/api/prayers/bulk/", payload, format="json")
        payload["prayers"] = [{"name": "bomdod", "status": "done"}]
        auth_api.post("/api/prayers/bulk/", payload, format="json")
        assert Prayer.objects.count() == 1
        assert Prayer.objects.get().status == "done"

    def test_bulk_rejects_duplicate_names(self, auth_api: APIClient) -> None:
        response = auth_api.post(
            "/api/prayers/bulk/",
            {
                "date": "2026-07-31",
                "prayers": [
                    {"name": "bomdod", "status": "done"},
                    {"name": "bomdod", "status": "missed"},
                ],
            },
            format="json",
        )
        assert response.status_code == 400

    def test_bulk_rejects_unknown_prayer(self, auth_api: APIClient) -> None:
        response = auth_api.post(
            "/api/prayers/bulk/",
            {"date": "2026-07-31", "prayers": [{"name": "tahajjud", "status": "done"}]},
            format="json",
        )
        assert response.status_code == 400

    def test_bulk_rejects_empty_list(self, auth_api: APIClient) -> None:
        response = auth_api.post(
            "/api/prayers/bulk/", {"date": "2026-07-31", "prayers": []}, format="json"
        )
        assert response.status_code == 400

    def test_filter_by_date(self, auth_api: APIClient, user: User) -> None:
        Prayer.objects.create(user=user, date=date(2026, 7, 31), name="asr", status="done")
        Prayer.objects.create(user=user, date=date(2026, 8, 1), name="asr", status="done")
        response = auth_api.get("/api/prayers/?date=2026-07-31")
        assert len(response.data) == 1

    def test_date_range_filter(self, auth_api: APIClient, user: User) -> None:
        for day in (29, 30, 31):
            Prayer.objects.create(
                user=user, date=date(2026, 7, day), name="asr", status="done"
            )
        response = auth_api.get("/api/prayers/?date_from=2026-07-30&date_to=2026-07-31")
        assert len(response.data) == 2

    def test_users_are_isolated(
        self, other_api: APIClient, user: User
    ) -> None:
        Prayer.objects.create(user=user, date=date(2026, 7, 31), name="asr", status="done")
        assert other_api.get("/api/prayers/").data == []

    def test_bulk_does_not_touch_other_users_rows(
        self, auth_api: APIClient, other_user: User
    ) -> None:
        foreign = Prayer.objects.create(
            user=other_user, date=date(2026, 7, 31), name="bomdod", status="missed"
        )
        auth_api.post(
            "/api/prayers/bulk/",
            {"date": "2026-07-31", "prayers": [{"name": "bomdod", "status": "done"}]},
            format="json",
        )
        foreign.refresh_from_db()
        assert foreign.status == "missed"
        assert Prayer.objects.count() == 2


class TestPrayerTimesEndpoint:
    def test_requires_auth(self, api: APIClient) -> None:
        assert api.get("/api/prayer-times/").status_code == 401

    def test_returns_five_prayers(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/prayer-times/?date=2026-07-31")
        assert response.status_code == 200
        assert set(response.data["times"]) == {
            "bomdod",
            "peshin",
            "asr",
            "shom",
            "xufton",
        }

    def test_uses_profile_location_when_query_omitted(
        self, auth_api: APIClient, user: User
    ) -> None:
        Profile.objects.filter(user=user).update(location_lat=55.75, location_lng=37.61)
        response = auth_api.get("/api/prayer-times/?date=2026-07-31")
        assert response.data["lat"] == 55.75

    def test_query_overrides_profile(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/prayer-times/?date=2026-07-31&lat=21.42&lng=39.82")
        assert response.data["lat"] == 21.42

    def test_offsets_shift_times(
        self, auth_api: APIClient, user: User
    ) -> None:
        base = auth_api.get("/api/prayer-times/?date=2026-07-31").data["times"]["bomdod"]
        Profile.objects.filter(user=user).update(prayer_offsets={"bomdod": 5})
        shifted = auth_api.get("/api/prayer-times/?date=2026-07-31").data["times"]["bomdod"]
        assert base != shifted

    def test_rejects_invalid_latitude(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/prayer-times/?lat=999&lng=0")
        assert response.status_code == 400


class TestComputePrayerTimes:
    def test_tashkent_hanafi_ordering(self) -> None:
        times = compute_prayer_times(
            day=date(2026, 7, 31), latitude=41.2995, longitude=69.2401
        )
        values = [times[k] for k in ("bomdod", "peshin", "asr", "shom", "xufton")]
        assert values == sorted(values)

    def test_hanafi_asr_is_later_than_shafi(self) -> None:
        kwargs = {"day": date(2026, 7, 31), "latitude": 41.2995, "longitude": 69.2401}
        hanafi = compute_prayer_times(madhab="Hanafi", **kwargs)  # type: ignore[arg-type]
        shafi = compute_prayer_times(madhab="Shafi", **kwargs)  # type: ignore[arg-type]
        assert hanafi["asr"] > shafi["asr"]

    def test_unknown_method_raises(self) -> None:
        with pytest.raises(UnsupportedCalcMethodError):
            compute_prayer_times(
                day=date(2026, 7, 31),
                latitude=41.2995,
                longitude=69.2401,
                calc_method="Nonexistent",
            )
