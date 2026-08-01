"""Server-side prayer time computation.

Mirrors the on-device adhan-js calculation so the API and the app agree.
Names are Uzbek: bomdod, peshin, asr, shom, xufton.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from adhanpy.calculation.CalculationMethod import CalculationMethod
from adhanpy.calculation.CalculationParameters import CalculationParameters
from adhanpy.calculation.Madhab import Madhab
from adhanpy.PrayerTimes import PrayerTimes

from apps.accounts.models import AsrMadhab, CalcMethod

_METHODS: dict[str, CalculationMethod] = {
    CalcMethod.MUSLIM_WORLD_LEAGUE: CalculationMethod.MUSLIM_WORLD_LEAGUE,
    CalcMethod.UMM_AL_QURA: CalculationMethod.UMM_AL_QURA,
    CalcMethod.EGYPTIAN: CalculationMethod.EGYPTIAN,
    CalcMethod.KARACHI: CalculationMethod.KARACHI,
    CalcMethod.DUBAI: CalculationMethod.DUBAI,
    CalcMethod.QATAR: CalculationMethod.QATAR,
    CalcMethod.KUWAIT: CalculationMethod.KUWAIT,
    CalcMethod.SINGAPORE: CalculationMethod.SINGAPORE,
    CalcMethod.MOONSIGHTING_COMMITTEE: CalculationMethod.MOON_SIGHTING_COMMITTEE,
    CalcMethod.NORTH_AMERICA: CalculationMethod.NORTH_AMERICA,
}

_MADHABS: dict[str, Madhab] = {
    AsrMadhab.HANAFI: Madhab.HANAFI,
    AsrMadhab.SHAFI: Madhab.SHAFI,
}

#: adhanpy attribute -> Uzbek prayer key.
_NAME_MAP: tuple[tuple[str, str], ...] = (
    ("fajr", "bomdod"),
    ("dhuhr", "peshin"),
    ("asr", "asr"),
    ("maghrib", "shom"),
    ("isha", "xufton"),
)


class UnsupportedCalcMethodError(ValueError):
    """Raised when a stored calc method has no server-side equivalent."""


def compute_prayer_times(
    *,
    day: date,
    latitude: float,
    longitude: float,
    calc_method: str = CalcMethod.MUSLIM_WORLD_LEAGUE,
    madhab: str = AsrMadhab.HANAFI,
    offsets: dict[str, int] | None = None,
    timezone: str = "Asia/Tashkent",
) -> dict[str, str]:
    """Return ``{"bomdod": "2026-07-31T03:24:00+05:00", ...}``.

    `offsets` shifts individual prayers by whole minutes, matching the
    per-user `Profile.prayer_offsets` correction the local mosque may need.
    """
    try:
        method = _METHODS[calc_method]
    except KeyError as exc:
        raise UnsupportedCalcMethodError(calc_method) from exc

    params = CalculationParameters(method=method)
    params.madhab = _MADHABS.get(madhab, Madhab.HANAFI)
    zone = ZoneInfo(timezone)

    times = PrayerTimes(
        (latitude, longitude),
        datetime(day.year, day.month, day.day),
        calculation_parameters=params,
        time_zone=zone,
    )

    shift = offsets or {}
    out: dict[str, str] = {}
    for attr, key in _NAME_MAP:
        moment: Any = getattr(times, attr)
        minutes = shift.get(key, 0)
        if minutes:
            moment = moment + timedelta(minutes=minutes)
        out[key] = moment.astimezone(zone).isoformat(timespec="seconds")
    return out
