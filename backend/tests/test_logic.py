"""Unit tests for pure Mizan computations (no DB)."""

from datetime import date

import pytest

from apps.mizan.logic import (
    answers_to_ratios,
    compute_mizan_score,
    compute_streak,
    heatmap_buckets,
    week_start_for,
)


class TestComputeStreak:
    def test_empty_input(self) -> None:
        assert compute_streak([]) == {"current": 0, "longest": 0}

    def test_all_missed(self) -> None:
        days = [{"date": "2026-01-01", "status": "missed"}]
        assert compute_streak(days, today=date(2026, 1, 1)) == {"current": 0, "longest": 0}

    def test_consecutive_days(self) -> None:
        days = [
            {"date": "2026-01-01", "status": "done"},
            {"date": "2026-01-02", "status": "done"},
            {"date": "2026-01-03", "status": "done"},
        ]
        assert compute_streak(days, today=date(2026, 1, 3)) == {"current": 3, "longest": 3}

    def test_excused_counts_as_done(self) -> None:
        days = [
            {"date": "2026-01-01", "status": "done"},
            {"date": "2026-01-02", "status": "excused"},
            {"date": "2026-01-03", "status": "done"},
        ]
        assert compute_streak(days, today=date(2026, 1, 3))["current"] == 3

    def test_gap_breaks_current_but_keeps_longest(self) -> None:
        days = [
            {"date": "2026-01-01", "status": "done"},
            {"date": "2026-01-02", "status": "done"},
            {"date": "2026-01-03", "status": "done"},
            {"date": "2026-01-05", "status": "done"},
        ]
        assert compute_streak(days, today=date(2026, 1, 5)) == {"current": 1, "longest": 3}

    def test_missed_status_breaks_chain(self) -> None:
        days = [
            {"date": "2026-01-01", "status": "done"},
            {"date": "2026-01-02", "status": "missed"},
            {"date": "2026-01-03", "status": "done"},
        ]
        assert compute_streak(days, today=date(2026, 1, 3)) == {"current": 1, "longest": 1}

    def test_unfinished_today_does_not_reset_streak(self) -> None:
        days = [
            {"date": "2026-01-01", "status": "done"},
            {"date": "2026-01-02", "status": "done"},
        ]
        assert compute_streak(days, today=date(2026, 1, 3))["current"] == 2

    def test_stale_streak_is_zero(self) -> None:
        days = [{"date": "2026-01-01", "status": "done"}]
        assert compute_streak(days, today=date(2026, 1, 20)) == {"current": 0, "longest": 1}

    def test_duplicate_dates_collapse(self) -> None:
        days = [
            {"date": "2026-01-01", "status": "missed"},
            {"date": "2026-01-01", "status": "done"},
            {"date": "2026-01-02", "status": "done"},
        ]
        assert compute_streak(days, today=date(2026, 1, 2))["current"] == 2

    def test_accepts_date_objects(self) -> None:
        days = [{"date": date(2026, 1, 1), "status": "done"}]
        assert compute_streak(days, today=date(2026, 1, 1))["current"] == 1

    def test_unordered_input(self) -> None:
        days = [
            {"date": "2026-01-03", "status": "done"},
            {"date": "2026-01-01", "status": "done"},
            {"date": "2026-01-02", "status": "done"},
        ]
        assert compute_streak(days, today=date(2026, 1, 3)) == {"current": 3, "longest": 3}


class TestComputeMizanScore:
    def test_all_zero(self) -> None:
        result = compute_mizan_score({})
        assert result["score"] == 0
        assert result["weakest"] is None
        assert set(result["radar"]) == {
            "ruhiy",
            "jismoniy",
            "moliyaviy",
            "ijtimoiy",
            "ilmiy",
        }

    def test_perfect_balance_scores_100(self) -> None:
        dims = dict.fromkeys(
            ["ruhiy", "jismoniy", "moliyaviy", "ijtimoiy", "ilmiy"], 1.0
        )
        assert compute_mizan_score(dims)["score"] == 100

    def test_balance_beats_imbalance_at_equal_mean(self) -> None:
        even = compute_mizan_score(
            {"ruhiy": 0.6, "jismoniy": 0.6, "moliyaviy": 0.6, "ijtimoiy": 0.6, "ilmiy": 0.6}
        )
        uneven = compute_mizan_score(
            {"ruhiy": 1.0, "jismoniy": 1.0, "moliyaviy": 1.0, "ijtimoiy": 0.0, "ilmiy": 0.0}
        )
        assert even["score"] > uneven["score"]

    def test_identifies_weakest_dimension(self) -> None:
        result = compute_mizan_score(
            {"ruhiy": 0.9, "jismoniy": 0.2, "moliyaviy": 0.8, "ijtimoiy": 0.7, "ilmiy": 0.6}
        )
        assert result["weakest"] == "jismoniy"

    @pytest.mark.parametrize("value", [-5.0, 1.5, 99.0])
    def test_clamps_out_of_range_input(self, value: float) -> None:
        result = compute_mizan_score({"ruhiy": value})
        assert 0.0 <= result["radar"]["ruhiy"] <= 1.0
        assert 0 <= result["score"] <= 100

    def test_missing_dimensions_default_to_zero(self) -> None:
        result = compute_mizan_score({"ruhiy": 1.0})
        assert result["radar"]["ilmiy"] == 0.0
        assert result["weakest"] != "ruhiy"


class TestAnswersToRatios:
    def test_maps_one_to_five_onto_zero_to_one(self) -> None:
        ratios = answers_to_ratios({"ruhiy": {"score": 5}, "ilmiy": {"score": 1}})
        assert ratios["ruhiy"] == 1.0
        assert ratios["ilmiy"] == 0.0

    def test_accepts_bare_numbers(self) -> None:
        assert answers_to_ratios({"ruhiy": 3})["ruhiy"] == 0.5

    def test_missing_dimension_is_zero(self) -> None:
        assert answers_to_ratios({})["moliyaviy"] == 0.0


class TestWeekStart:
    @pytest.mark.parametrize(
        "day,expected",
        [
            (date(2026, 2, 2), date(2026, 2, 2)),  # Monday
            (date(2026, 2, 5), date(2026, 2, 2)),  # Thursday
            (date(2026, 2, 8), date(2026, 2, 2)),  # Sunday
        ],
    )
    def test_returns_monday(self, day: date, expected: date) -> None:
        assert week_start_for(day) == expected


class TestHeatmapBuckets:
    def test_covers_full_range_with_zero_fill(self) -> None:
        buckets = heatmap_buckets([], weeks=2, today=date(2026, 2, 5))
        assert buckets[0]["date"] == "2026-01-26"
        assert buckets[-1]["date"] == "2026-02-05"
        assert all(b["ratio"] == 0.0 for b in buckets)

    def test_ratio_per_day(self) -> None:
        days = [
            {"date": "2026-02-05", "status": "done"},
            {"date": "2026-02-05", "status": "missed"},
        ]
        buckets = heatmap_buckets(days, weeks=1, today=date(2026, 2, 5))
        assert buckets[-1]["ratio"] == 0.5
        assert buckets[-1]["total"] == 2

    def test_ignores_days_outside_window(self) -> None:
        days = [{"date": "2020-01-01", "status": "done"}]
        buckets = heatmap_buckets(days, weeks=1, today=date(2026, 2, 5))
        assert all(b["total"] == 0 for b in buckets)
