"""Serializers for categories and transactions."""

from typing import Any, cast

from rest_framework import serializers

from apps.finance.models import Category, Transaction


class CategorySerializer(serializers.ModelSerializer[Category]):
    class Meta:
        model = Category
        fields = (
            "id",
            "name_uz",
            "type",
            "dimension",
            "icon",
            "is_sadaqa",
            "sort_order",
        )
        read_only_fields = ("id",)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        user = self.context["request"].user
        name = attrs.get("name_uz") or getattr(self.instance, "name_uz", None)
        type_ = attrs.get("type") or getattr(self.instance, "type", None)
        clash = Category.objects.filter(user=user, name_uz=name, type=type_)
        if self.instance is not None:
            clash = clash.exclude(pk=cast(Category, self.instance).pk)
        if clash.exists():
            raise serializers.ValidationError(
                {"name_uz": "Bu nomdagi turkum allaqachon mavjud."}
            )
        return attrs


class TransactionSerializer(serializers.ModelSerializer[Transaction]):
    category_name = serializers.CharField(source="category.name_uz", read_only=True)
    is_sadaqa = serializers.BooleanField(source="category.is_sadaqa", read_only=True)

    class Meta:
        model = Transaction
        fields = (
            "id",
            "amount",
            "currency",
            "type",
            "category",
            "category_name",
            "is_sadaqa",
            "note",
            "date",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_category(self, value: Category | None) -> Category | None:
        if value is not None and value.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("Topilmadi.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        category = attrs.get("category") or getattr(self.instance, "category", None)
        type_ = attrs.get("type") or getattr(self.instance, "type", None)
        if category is not None and type_ is not None and category.type != type_:
            raise serializers.ValidationError(
                {"category": "Turkum turi tranzaksiya turiga mos emas."}
            )
        return attrs
