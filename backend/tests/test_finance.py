"""Finance endpoint tests."""

from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.finance.models import Category, Transaction

pytestmark = pytest.mark.django_db


@pytest.fixture
def expense_category(user: User) -> Category:
    return Category.objects.get(user=user, name_uz="Oziq-ovqat")


@pytest.fixture
def sadaqa_category(user: User) -> Category:
    return Category.objects.get(user=user, name_uz="Sadaqa")


class TestDefaultCategories:
    def test_seeded_on_registration(self, api: APIClient) -> None:
        api.post("/api/auth/register/", {"username": "yangi", "password": "Parol12345!"})
        assert Category.objects.filter(user__username="yangi").count() == 10

    def test_sadaqa_flag_present(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/categories/")
        sadaqa = [c for c in response.data if c["is_sadaqa"]]
        assert [c["name_uz"] for c in sadaqa] == ["Sadaqa"]


class TestCategories:
    def test_requires_auth(self, api: APIClient) -> None:
        assert api.get("/api/categories/").status_code == 401

    def test_create(self, auth_api: APIClient) -> None:
        response = auth_api.post(
            "/api/categories/",
            {"name_uz": "Kitoblar", "type": "expense", "dimension": "ilmiy"},
            format="json",
        )
        assert response.status_code == 201

    def test_rejects_duplicate_name_and_type(self, auth_api: APIClient) -> None:
        response = auth_api.post(
            "/api/categories/", {"name_uz": "Sadaqa", "type": "expense"}, format="json"
        )
        assert response.status_code == 400

    def test_same_name_different_type_allowed(self, auth_api: APIClient) -> None:
        response = auth_api.post(
            "/api/categories/", {"name_uz": "Sadaqa", "type": "income"}, format="json"
        )
        assert response.status_code == 201

    def test_filter_by_type(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/categories/?type=income")
        assert {c["type"] for c in response.data} == {"income"}

    def test_isolated_between_users(
        self, auth_api: APIClient, other_api: APIClient
    ) -> None:
        auth_api.post(
            "/api/categories/", {"name_uz": "Maxfiy", "type": "expense"}, format="json"
        )
        names = {c["name_uz"] for c in other_api.get("/api/categories/").data}
        assert "Maxfiy" not in names


class TestTransactions:
    def test_create(self, auth_api: APIClient, expense_category: Category) -> None:
        response = auth_api.post(
            "/api/transactions/",
            {
                "amount": "150000.00",
                "type": "expense",
                "category": expense_category.pk,
                "date": "2026-07-15",
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.data["category_name"] == "Oziq-ovqat"
        assert response.data["currency"] == "UZS"

    def test_rejects_zero_amount(
        self, auth_api: APIClient, expense_category: Category
    ) -> None:
        response = auth_api.post(
            "/api/transactions/",
            {"amount": "0", "type": "expense", "date": "2026-07-15"},
            format="json",
        )
        assert response.status_code == 400

    def test_rejects_category_type_mismatch(
        self, auth_api: APIClient, expense_category: Category
    ) -> None:
        response = auth_api.post(
            "/api/transactions/",
            {
                "amount": "100",
                "type": "income",
                "category": expense_category.pk,
                "date": "2026-07-15",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_rejects_other_users_category(
        self, auth_api: APIClient, other_user: User
    ) -> None:
        foreign = Category.objects.filter(user=other_user).first()
        assert foreign is not None
        response = auth_api.post(
            "/api/transactions/",
            {
                "amount": "100",
                "type": "expense",
                "category": foreign.pk,
                "date": "2026-07-15",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_filter_by_month(
        self, auth_api: APIClient, user: User, expense_category: Category
    ) -> None:
        Transaction.objects.create(
            user=user,
            amount=Decimal("100"),
            type="expense",
            category=expense_category,
            date=date(2026, 7, 15),
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal("200"),
            type="expense",
            category=expense_category,
            date=date(2026, 8, 1),
        )
        assert len(auth_api.get("/api/transactions/?month=2026-07").data) == 1

    def test_december_month_boundary(
        self, auth_api: APIClient, user: User, expense_category: Category
    ) -> None:
        Transaction.objects.create(
            user=user,
            amount=Decimal("100"),
            type="expense",
            category=expense_category,
            date=date(2026, 12, 31),
        )
        assert len(auth_api.get("/api/transactions/?month=2026-12").data) == 1

    def test_rejects_bad_month_format(self, auth_api: APIClient) -> None:
        assert auth_api.get("/api/transactions/?month=july").status_code == 400

    def test_delete(
        self, auth_api: APIClient, user: User, expense_category: Category
    ) -> None:
        tx = Transaction.objects.create(
            user=user,
            amount=Decimal("100"),
            type="expense",
            category=expense_category,
            date=date(2026, 7, 15),
        )
        assert auth_api.delete(f"/api/transactions/{tx.pk}/").status_code == 204

    def test_isolated_between_users(
        self, other_api: APIClient, user: User, expense_category: Category
    ) -> None:
        Transaction.objects.create(
            user=user,
            amount=Decimal("100"),
            type="expense",
            category=expense_category,
            date=date(2026, 7, 15),
        )
        assert other_api.get("/api/transactions/").data == []


class TestSummary:
    @pytest.fixture(autouse=True)
    def _seed(
        self,
        user: User,
        expense_category: Category,
        sadaqa_category: Category,
    ) -> None:
        income = Category.objects.get(user=user, name_uz="Maosh")
        Transaction.objects.create(
            user=user,
            amount=Decimal("5000000"),
            type="income",
            category=income,
            date=date(2026, 7, 1),
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal("1250000"),
            type="expense",
            category=expense_category,
            date=date(2026, 7, 5),
        )
        Transaction.objects.create(
            user=user,
            amount=Decimal("250000"),
            type="expense",
            category=sadaqa_category,
            date=date(2026, 7, 9),
        )

    def test_totals(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/transactions/summary/?month=2026-07")
        assert response.status_code == 200
        # Money must be strings, never JSON floats.
        assert isinstance(response.data["income"], str)
        assert Decimal(response.data["income"]) == Decimal("5000000")
        assert Decimal(response.data["expense"]) == Decimal("1500000")
        assert Decimal(response.data["sadaqa"]) == Decimal("250000")
        assert Decimal(response.data["balance"]) == Decimal("3500000")

    def test_by_category_sorted_desc(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/transactions/summary/?month=2026-07")
        rows = response.data["by_category"]
        assert [r["name"] for r in rows] == ["Oziq-ovqat", "Sadaqa"]
        assert rows[1]["is_sadaqa"] is True

    def test_requires_month(self, auth_api: APIClient) -> None:
        assert auth_api.get("/api/transactions/summary/").status_code == 400

    def test_empty_month_returns_zeros(self, auth_api: APIClient) -> None:
        response = auth_api.get("/api/transactions/summary/?month=2026-01")
        assert Decimal(response.data["income"]) == Decimal("0")
        assert response.data["by_category"] == []

    def test_other_user_sees_own_zeros(self, other_api: APIClient) -> None:
        response = other_api.get("/api/transactions/summary/?month=2026-07")
        assert Decimal(response.data["expense"]) == Decimal("0")
