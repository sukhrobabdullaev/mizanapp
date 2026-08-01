"""Pure computation used by the Mizan tab. No DB access, fully unit-tested."""

from __future__ import annotations

import statistics
from collections.abc import Iterable, Mapping, Sequence
from datetime import date, timedelta
from itertools import pairwise
from typing import Any, TypedDict

from apps.common.enums import DimensionKey

#: A prayer/task day counts toward a streak when it is done or excused.
STREAK_OK_STATUSES = frozenset({"done", "excused"})


class StreakResult(TypedDict):
    current: int
    longest: int


class MizanResult(TypedDict):
    score: int
    weakest: str | None
    radar: dict[str, float]


def _parse_day(value: Any) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def compute_streak(days: Sequence[Mapping[str, Any]], today: date | None = None) -> StreakResult:
    """Current and longest consecutive-day streaks.

    `days` is an iterable of ``{"date": ..., "status": ...}``. Statuses in
    :data:`STREAK_OK_STATUSES` count as kept; anything else breaks the chain.
    Duplicate dates collapse: a day counts if *any* entry for it is kept.
    Nothing is stored — the value is always derived.

    The current streak is only non-zero when the chain reaches ``today`` or
    yesterday, so an unfinished today does not reset a live streak.
    """
    kept: set[date] = set()
    seen: set[date] = set()
    for entry in days:
        day = _parse_day(entry["date"])
        seen.add(day)
        if str(entry.get("status")) in STREAK_OK_STATUSES:
            kept.add(day)

    if not kept:
        return {"current": 0, "longest": 0}

    ordered = sorted(kept)
    longest = 1
    run = 1
    for previous, current in pairwise(ordered):
        run = run + 1 if current - previous == timedelta(days=1) else 1
        longest = max(longest, run)

    anchor = today or max(seen)
    if anchor not in kept:
        anchor = anchor - timedelta(days=1)
        if anchor not in kept:
            return {"current": 0, "longest": longest}

    current_streak = 0
    cursor = anchor
    while cursor in kept:
        current_streak += 1
        cursor -= timedelta(days=1)

    return {"current": current_streak, "longest": longest}


def compute_mizan_score(dimensions: Mapping[str, float]) -> MizanResult:
    """Balance-weighted score across the five life dimensions.

    Each dimension is a 0.0-1.0 ratio. The score rewards a high mean *and*
    punishes imbalance: ``mean * (1 - stdev) * 100``, clamped to 0-100. Five
    strong-but-uneven dimensions score lower than five moderate even ones,
    which is the whole point of a mizan (balance) metric.
    """
    radar = {
        key: min(1.0, max(0.0, float(dimensions.get(key, 0.0))))
        for key in DimensionKey.values
    }
    values = list(radar.values())

    mean = statistics.fmean(values)
    spread = statistics.pstdev(values) if len(values) > 1 else 0.0
    score = int(round(max(0.0, min(100.0, mean * (1.0 - spread) * 100.0))))

    weakest = min(radar, key=lambda key: radar[key]) if any(values) else None
    return {"score": score, "weakest": weakest, "radar": radar}


def week_start_for(day: date) -> date:
    """Monday of the ISO week containing `day`."""
    return day - timedelta(days=day.weekday())


def answers_to_ratios(answers: Mapping[str, Any]) -> dict[str, float]:
    """Convert muhosaba answers ({"ruhiy": {"score": 4}}) to 0.0-1.0 ratios.

    Scores are 1-5 on the survey; 1 maps to 0.0 and 5 to 1.0.
    """
    ratios: dict[str, float] = {}
    for key in DimensionKey.values:
        raw = answers.get(key)
        score = raw.get("score") if isinstance(raw, Mapping) else raw
        if score is None:
            ratios[key] = 0.0
            continue
        ratios[key] = max(0.0, min(1.0, (float(score) - 1.0) / 4.0))
    return ratios


def heatmap_buckets(
    days: Iterable[Mapping[str, Any]], weeks: int, today: date
) -> list[dict[str, Any]]:
    """Per-day completion ratios for the trailing `weeks` weeks (12-week heatmap)."""
    start = week_start_for(today) - timedelta(weeks=weeks - 1)
    totals: dict[date, list[int]] = {}
    for entry in days:
        day = _parse_day(entry["date"])
        if day < start or day > today:
            continue
        bucket = totals.setdefault(day, [0, 0])
        bucket[1] += 1
        if str(entry.get("status")) in STREAK_OK_STATUSES:
            bucket[0] += 1

    out: list[dict[str, Any]] = []
    cursor = start
    while cursor <= today:
        done, total = totals.get(cursor, [0, 0])
        out.append(
            {
                "date": cursor.isoformat(),
                "ratio": round(done / total, 4) if total else 0.0,
                "total": total,
            }
        )
        cursor += timedelta(days=1)
    return out
