"""Built-in challenge templates shown in the Maqsadlar gallery."""

from typing import Any

from apps.common.enums import DimensionKey, Priority

BUILTIN_CHALLENGES: tuple[dict[str, Any], ...] = (
    {
        "slug": "40-kun-bomdod",
        "title_uz": "40 kunlik bomdod",
        "description_uz": (
            "40 kun davomida bomdod namozini jamoat bilan yoki vaqtida o'qish."
        ),
        "dimension": DimensionKey.RUHIY,
        "duration_days": 40,
        "schedule": {
            "milestones": [
                {"title": "Birinchi 10 kun", "day": 1},
                {"title": "Yarim yo'l", "day": 20},
                {"title": "Oxirgi 10 kun", "day": 31},
            ],
            "daily_tasks": [
                {"title": "Bomdod namozini vaqtida o'qish", "priority": Priority.HIGH},
                {
                    "title": "Erta yotish (23:00 gacha)",
                    "priority": Priority.MEDIUM,
                },
            ],
        },
    },
    {
        "slug": "30-kun-kitobxonlik",
        "title_uz": "30 kunlik kitobxonlik",
        "description_uz": "Har kuni kamida 20 daqiqa foydali kitob o'qish.",
        "dimension": DimensionKey.ILMIY,
        "duration_days": 30,
        "schedule": {
            "milestones": [
                {"title": "Birinchi kitob boshlandi", "day": 1},
                {"title": "Yarmi o'qildi", "day": 15},
                {"title": "Kitob tugadi", "day": 30},
            ],
            "daily_tasks": [
                {"title": "20 daqiqa kitob o'qish", "priority": Priority.HIGH},
                {
                    "title": "O'qiganlardan qisqacha yozib qo'yish",
                    "priority": Priority.LOW,
                    "days": {"every": 3},
                },
            ],
        },
    },
    {
        "slug": "21-kun-sogliq",
        "title_uz": "21 kunlik sog'lom hayot",
        "description_uz": "Kuniga 8000 qadam, ertalabki mashq va suv rejimi.",
        "dimension": DimensionKey.JISMONIY,
        "duration_days": 21,
        "schedule": {
            "milestones": [
                {"title": "Odat shakllanmoqda", "day": 1},
                {"title": "Ikkinchi hafta", "day": 8},
                {"title": "Uchinchi hafta", "day": 15},
            ],
            "daily_tasks": [
                {"title": "8000 qadam yurish", "priority": Priority.HIGH},
                {"title": "Ertalabki mashq (10 daqiqa)", "priority": Priority.MEDIUM},
                {"title": "2 litr suv ichish", "priority": Priority.LOW},
            ],
        },
    },
)
