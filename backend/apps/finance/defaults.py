"""Default category set seeded for every new user."""

from typing import Any

from apps.common.enums import DimensionKey, TransactionType

DEFAULT_CATEGORIES: tuple[dict[str, Any], ...] = (
    {
        "name_uz": "Oziq-ovqat",
        "type": TransactionType.EXPENSE,
        "dimension": DimensionKey.JISMONIY,
        "icon": "restaurant",
    },
    {
        "name_uz": "Transport",
        "type": TransactionType.EXPENSE,
        "dimension": DimensionKey.MOLIYAVIY,
        "icon": "bus",
    },
    {
        "name_uz": "Uy-joy",
        "type": TransactionType.EXPENSE,
        "dimension": DimensionKey.MOLIYAVIY,
        "icon": "home",
    },
    {
        "name_uz": "Sog'liq",
        "type": TransactionType.EXPENSE,
        "dimension": DimensionKey.JISMONIY,
        "icon": "medkit",
    },
    {
        "name_uz": "Ta'lim",
        "type": TransactionType.EXPENSE,
        "dimension": DimensionKey.ILMIY,
        "icon": "book",
    },
    {
        "name_uz": "Oila",
        "type": TransactionType.EXPENSE,
        "dimension": DimensionKey.IJTIMOIY,
        "icon": "people",
    },
    {
        "name_uz": "Sadaqa",
        "type": TransactionType.EXPENSE,
        "dimension": DimensionKey.RUHIY,
        "icon": "heart",
        "is_sadaqa": True,
    },
    {
        "name_uz": "Boshqa",
        "type": TransactionType.EXPENSE,
        "dimension": None,
        "icon": "ellipsis-horizontal",
    },
    {
        "name_uz": "Maosh",
        "type": TransactionType.INCOME,
        "dimension": DimensionKey.MOLIYAVIY,
        "icon": "wallet",
    },
    {
        "name_uz": "Qo'shimcha daromad",
        "type": TransactionType.INCOME,
        "dimension": DimensionKey.MOLIYAVIY,
        "icon": "trending-up",
    },
)
