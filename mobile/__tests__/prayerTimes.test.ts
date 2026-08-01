import { computePrayerTimes, nextPrayer } from '../src/lib/prayerTimes';

const TASHKENT = { latitude: 41.2995, longitude: 69.2401 };
const DAY = new Date('2026-07-31T09:00:00+05:00');

describe('computePrayerTimes', () => {
  it('returns the five prayers in daily order', () => {
    const times = computePrayerTimes({ ...TASHKENT, date: DAY });
    expect(times.map((entry) => entry.name)).toEqual([
      'bomdod',
      'peshin',
      'asr',
      'shom',
      'xufton',
    ]);
    const stamps = times.map((entry) => entry.time.getTime());
    expect([...stamps].sort((a, b) => a - b)).toEqual(stamps);
  });

  it('matches the Django API for Toshkent (03:24 / 17:33 local)', () => {
    const times = computePrayerTimes({ ...TASHKENT, date: DAY });
    const bomdod = times.find((entry) => entry.name === 'bomdod');
    const asr = times.find((entry) => entry.name === 'asr');
    expect(bomdod?.time.toISOString()).toBe('2026-07-30T22:24:00.000Z');
    expect(asr?.time.toISOString()).toBe('2026-07-31T12:33:00.000Z');
  });

  it('puts Hanafi asr later than Shafi', () => {
    const hanafi = computePrayerTimes({ ...TASHKENT, date: DAY, madhab: 'Hanafi' });
    const shafi = computePrayerTimes({ ...TASHKENT, date: DAY, madhab: 'Shafi' });
    const asrOf = (list: typeof hanafi) =>
      list.find((entry) => entry.name === 'asr')!.time.getTime();
    expect(asrOf(hanafi)).toBeGreaterThan(asrOf(shafi));
  });

  it('applies per-prayer offsets', () => {
    const base = computePrayerTimes({ ...TASHKENT, date: DAY });
    const shifted = computePrayerTimes({
      ...TASHKENT,
      date: DAY,
      offsets: { bomdod: 5 },
    });
    const diff =
      shifted[0]!.time.getTime() - base[0]!.time.getTime();
    expect(diff).toBe(5 * 60_000);
  });

  it('falls back to Muslim World League for an unknown method', () => {
    const fallback = computePrayerTimes({ ...TASHKENT, date: DAY, calcMethod: 'Nope' });
    const mwl = computePrayerTimes({
      ...TASHKENT,
      date: DAY,
      calcMethod: 'MuslimWorldLeague',
    });
    expect(fallback[0]!.time.getTime()).toBe(mwl[0]!.time.getTime());
  });
});

describe('nextPrayer', () => {
  it('picks the upcoming prayer of the same day', () => {
    const now = new Date('2026-07-31T13:00:00+05:00');
    const result = nextPrayer({ ...TASHKENT }, now);
    expect(result.name).toBe('asr');
    expect(result.msRemaining).toBeGreaterThan(0);
  });

  it('rolls over to tomorrow after xufton instead of going negative', () => {
    const now = new Date('2026-07-31T23:30:00+05:00');
    const result = nextPrayer({ ...TASHKENT }, now);
    expect(result.name).toBe('bomdod');
    expect(result.msRemaining).toBeGreaterThan(0);
  });
});
