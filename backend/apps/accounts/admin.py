"""Admin registrations for operational access."""

from typing import Any

from django.contrib import admin

from apps.accounts.models import Profile
from apps.finance.models import Category, Transaction
from apps.goals.models import ChallengeTemplate, Goal, Milestone, Task
from apps.mizan.models import Review
from apps.prayers.models import Prayer


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin[Profile]):
    list_display = ("user", "location_name", "calc_method", "asr_madhab")
    search_fields = ("user__username",)


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin[Goal]):
    list_display = ("title", "user", "dimension", "priority", "status", "target_date")
    list_filter = ("dimension", "priority", "status")
    search_fields = ("title", "user__username")


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin[Milestone]):
    list_display = ("title", "goal", "due_date", "status")
    list_filter = ("status",)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin[Task]):
    list_display = ("title", "user", "date", "priority", "status")
    list_filter = ("priority", "status")
    date_hierarchy = "date"


@admin.register(ChallengeTemplate)
class ChallengeTemplateAdmin(admin.ModelAdmin[ChallengeTemplate]):
    list_display = ("title_uz", "slug", "dimension", "duration_days", "is_builtin")
    list_filter = ("dimension", "is_builtin")
    prepopulated_fields: dict[str, Any] = {"slug": ("title_uz",)}


@admin.register(Prayer)
class PrayerAdmin(admin.ModelAdmin[Prayer]):
    list_display = ("user", "date", "name", "status")
    list_filter = ("name", "status")
    date_hierarchy = "date"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin[Category]):
    list_display = ("name_uz", "user", "type", "dimension", "is_sadaqa")
    list_filter = ("type", "dimension", "is_sadaqa")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin[Transaction]):
    list_display = ("user", "date", "type", "amount", "currency", "category")
    list_filter = ("type", "currency")
    date_hierarchy = "date"


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin[Review]):
    list_display = ("user", "week_start", "mizan_score")
    date_hierarchy = "week_start"
