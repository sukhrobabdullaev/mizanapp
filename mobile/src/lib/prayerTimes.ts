/** On-device prayer times.
 *
 * Uses adhan-js so the prayer strip and countdown keep working offline. The
 * calculation methods here are exactly the ones the Django API supports, so
 * on-device and server results agree to the minute.
 */

import {
  CalculationMethod,
  type CalculationParameters,
  Coordinates,
  Madhab,
  PrayerTimes,
} from 'adhan';

import type { PrayerName } from '../types/api';
import { PRAYER_ORDER } from '../types/api';

export type CalcMethodKey =
  | 'MuslimWorldLeague'
  | 'UmmAlQura'
  | 'Egyptian'
  | 'Karachi'
  | 'Dubai'
  | 'Qatar'
  | 'Kuwait'
  | 'Singapore'
  | 'MoonsightingCommittee'
  | 'NorthAmerica';

const METHOD_FACTORIES: Record<CalcMethodKey, () => CalculationParameters> = {
  MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
  UmmAlQura: CalculationMethod.UmmAlQura,
  Egyptian: CalculationMethod.Egyptian,
  Karachi: CalculationMethod.Karachi,
  Dubai: CalculationMethod.Dubai,
  Qatar: CalculationMethod.Qatar,
  Kuwait: CalculationMethod.Kuwait,
  Singapore: CalculationMethod.Singapore,
  MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
  NorthAmerica: CalculationMethod.NorthAmerica,
};

export const CALC_METHOD_LABELS: Record<CalcMethodKey, string> = {
  MuslimWorldLeague: 'Butunjahon Musulmonlar Ligasi',
  UmmAlQura: 'Ummul Qura (Makka)',
  Egyptian: 'Misr',
  Karachi: 'Karachi',
  Dubai: 'Dubay',
  Qatar: 'Qatar',
  Kuwait: 'Quvayt',
  Singapore: 'Singapur',
  MoonsightingCommittee: 'Moonsighting Committee',
  NorthAmerica: 'Shimoliy Amerika (ISNA)',
};

/** adhan-js field name for each Uzbek prayer key. */
const FIELD_BY_NAME: Record<PrayerName, 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'> = {
  bomdod: 'fajr',
  peshin: 'dhuhr',
  asr: 'asr',
  shom: 'maghrib',
  xufton: 'isha',
};

export interface PrayerTimeEntry {
  name: PrayerName;
  time: Date;
}

export interface ComputeOptions {
  latitude: number;
  longitude: number;
  date?: Date;
  calcMethod?: string;
  madhab?: 'Hanafi' | 'Shafi';
  /** Per-prayer minute corrections from the user's profile. */
  offsets?: Partial<Record<PrayerName, number>>;
}

/** Toshkent — used until the user grants location. */
export const DEFAULT_COORDS = { latitude: 41.2995, longitude: 69.2401 };

function resolveParams(
  calcMethod: string | undefined,
  madhab: 'Hanafi' | 'Shafi' | undefined,
): CalculationParameters {
  const factory =
    METHOD_FACTORIES[(calcMethod ?? 'MuslimWorldLeague') as CalcMethodKey] ??
    CalculationMethod.MuslimWorldLeague;
  const params = factory();
  params.madhab = madhab === 'Shafi' ? Madhab.Shafi : Madhab.Hanafi;
  return params;
}

/** The five daily prayers, in order, with offsets applied. */
export function computePrayerTimes(options: ComputeOptions): PrayerTimeEntry[] {
  const {
    latitude,
    longitude,
    date = new Date(),
    calcMethod,
    madhab,
    offsets = {},
  } = options;

  const times = new PrayerTimes(
    new Coordinates(latitude, longitude),
    date,
    resolveParams(calcMethod, madhab),
  );

  return PRAYER_ORDER.map((name) => {
    const base = times[FIELD_BY_NAME[name]];
    const shift = offsets[name] ?? 0;
    return {
      name,
      time: shift ? new Date(base.getTime() + shift * 60_000) : new Date(base.getTime()),
    };
  });
}

export interface NextPrayer {
  name: PrayerName;
  time: Date;
  msRemaining: number;
}

/**
 * The next prayer relative to `now`, rolling over to tomorrow's bomdod after
 * xufton so the countdown never shows a negative value at night.
 */
export function nextPrayer(
  options: ComputeOptions,
  now: Date = new Date(),
): NextPrayer {
  const today = computePrayerTimes({ ...options, date: now });
  const upcoming = today.find((entry) => entry.time.getTime() > now.getTime());
  if (upcoming) {
    return {
      name: upcoming.name,
      time: upcoming.time,
      msRemaining: upcoming.time.getTime() - now.getTime(),
    };
  }

  const tomorrow = new Date(now.getTime());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [first] = computePrayerTimes({ ...options, date: tomorrow });
  // PRAYER_ORDER is non-empty, so `first` always exists.
  const fallback = first as PrayerTimeEntry;
  return {
    name: fallback.name,
    time: fallback.time,
    msRemaining: fallback.time.getTime() - now.getTime(),
  };
}
