"""Personal finance: categories and transactions."""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from apps.common.enums import DimensionKey, TransactionType
from apps.common.models import OwnedModel


class Category(OwnedModel):
    name_uz = models.CharField(max_length=100)
    type = models.CharField(max_length=8, choices=TransactionType.choices)
    # Nullable on purpose: this is an optional enum, so NULL means "no
    # dimension" rather than the empty string being a valid choice.
    # (DJ001 is silenced for this file in pyproject.toml.)
    dimension = models.CharField(
        max_length=16, choices=DimensionKey.choices, null=True, blank=True
    )
    icon = models.CharField(max_length=64, blank=True)
    is_sadaqa = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name_uz", "type"], name="uniq_category_per_user_name_type"
            )
        ]
        indexes = [models.Index(fields=["user", "type"])]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name_uz


class Transaction(OwnedModel):
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.CharField(max_length=3, default="UZS")
    type = models.CharField(max_length=8, choices=TransactionType.choices)
    category = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="transactions",
    )
    note = models.TextField(blank=True)
    date = models.DateField()

    class Meta:
        ordering = ("-date", "-created_at")
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "type"]),
        ]

    def __str__(self) -> str:
        return f"{self.type} {self.amount} {self.currency}"
