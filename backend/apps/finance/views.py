"""Finance endpoints: categories, transactions, monthly summary."""

from datetime import date
from decimal import Decimal
from typing import Any

from django.db.models import DecimalField, Q, QuerySet, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from apps.common.enums import TransactionType
from apps.common.typing import current_user
from apps.common.views import OwnedModelViewSet
from apps.finance.models import Category, Transaction
from apps.finance.serializers import CategorySerializer, TransactionSerializer

_ZERO = Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2))


def _money(value: Decimal) -> str:
    """Serialize money as a string.

    DRF's DecimalField does this for model serializers; aggregates bypass the
    serializer layer, and letting a Decimal reach the JSON encoder would turn
    it into a float and lose precision on large UZS amounts.
    """
    return str(value.quantize(Decimal("0.01")))


def _month_bounds(month: str) -> tuple[date, date]:
    """`"2026-07"` -> (2026-07-01, 2026-07-31)."""
    try:
        year_str, month_str = month.split("-")
        year, month_number = int(year_str), int(month_str)
        start = date(year, month_number, 1)
    except (ValueError, TypeError) as exc:
        raise ValidationError({"month": "Format: YYYY-MM"}) from exc
    end = (
        date(year + 1, 1, 1)
        if month_number == 12
        else date(year, month_number + 1, 1)
    )
    return start, end


class CategoryViewSet(OwnedModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_queryset(self) -> QuerySet[Category]:
        qs: QuerySet[Category] = super().get_queryset()
        type_ = self.request.query_params.get("type")
        if type_:
            qs = qs.filter(type=type_)
        return qs


class TransactionViewSet(OwnedModelViewSet):
    queryset = Transaction.objects.select_related("category").all()
    serializer_class = TransactionSerializer

    def get_queryset(self) -> QuerySet[Transaction]:
        qs: QuerySet[Transaction] = super().get_queryset()
        month = self.request.query_params.get("month")
        if month:
            start, end = _month_bounds(month)
            qs = qs.filter(date__gte=start, date__lt=end)
        type_ = self.request.query_params.get("type")
        if type_:
            qs = qs.filter(type=type_)
        return qs

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request: Request) -> Response:
        """Month totals plus per-category breakdown for the donut chart."""
        month = request.query_params.get("month")
        if not month:
            return Response(
                {"month": "So'rovda `month=YYYY-MM` bo'lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        start, end = _month_bounds(month)
        qs = Transaction.objects.filter(
            user=current_user(request), date__gte=start, date__lt=end
        )

        totals = qs.aggregate(
            income=Coalesce(
                Sum("amount", filter=Q(type=TransactionType.INCOME)), _ZERO
            ),
            expense=Coalesce(
                Sum("amount", filter=Q(type=TransactionType.EXPENSE)), _ZERO
            ),
            sadaqa=Coalesce(
                Sum("amount", filter=Q(category__is_sadaqa=True)), _ZERO
            ),
        )

        grouped = (
            qs.filter(type=TransactionType.EXPENSE)
            .values(
                "category",
                "category__name_uz",
                "category__is_sadaqa",
                "category__dimension",
            )
            .annotate(total=Coalesce(Sum("amount"), _ZERO))
            .order_by("-total")
        )
        by_category: list[dict[str, Any]] = [
            {
                "category": row["category"],
                "name": row["category__name_uz"],
                "is_sadaqa": row["category__is_sadaqa"],
                "dimension": row["category__dimension"],
                "total": _money(row["total"]),
            }
            for row in grouped
        ]

        return Response(
            {
                "month": month,
                "income": _money(totals["income"]),
                "expense": _money(totals["expense"]),
                "sadaqa": _money(totals["sadaqa"]),
                "balance": _money(totals["income"] - totals["expense"]),
                "by_category": by_category,
            }
        )
