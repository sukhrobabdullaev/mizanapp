"""Choice enums shared across apps."""

from django.db import models


class Priority(models.TextChoices):
    HIGH = "high", "Yuqori"
    MEDIUM = "medium", "O'rta"
    LOW = "low", "Past"


class DimensionKey(models.TextChoices):
    """The five life dimensions the Mizan score is built from."""

    RUHIY = "ruhiy", "Ruhiy"
    JISMONIY = "jismoniy", "Jismoniy"
    MOLIYAVIY = "moliyaviy", "Moliyaviy"
    IJTIMOIY = "ijtimoiy", "Ijtimoiy"
    ILMIY = "ilmiy", "Ilmiy"


class GoalStatus(models.TextChoices):
    ACTIVE = "active", "Faol"
    DONE = "done", "Bajarilgan"
    ARCHIVED = "archived", "Arxivlangan"


class TaskStatus(models.TextChoices):
    PENDING = "pending", "Kutilmoqda"
    DONE = "done", "Bajarilgan"
    SKIPPED = "skipped", "O'tkazib yuborilgan"


class PrayerName(models.TextChoices):
    BOMDOD = "bomdod", "Bomdod"
    PESHIN = "peshin", "Peshin"
    ASR = "asr", "Asr"
    SHOM = "shom", "Shom"
    XUFTON = "xufton", "Xufton"


class PrayerStatus(models.TextChoices):
    DONE = "done", "O'qilgan"
    MISSED = "missed", "Qazo"
    EXCUSED = "excused", "Uzrli"
    LATE = "late", "Kech"


class TransactionType(models.TextChoices):
    INCOME = "income", "Kirim"
    EXPENSE = "expense", "Chiqim"


#: Prayer names in daily order — relied on by the mobile prayer strip.
PRAYER_ORDER: tuple[str, ...] = (
    PrayerName.BOMDOD,
    PrayerName.PESHIN,
    PrayerName.ASR,
    PrayerName.SHOM,
    PrayerName.XUFTON,
)
