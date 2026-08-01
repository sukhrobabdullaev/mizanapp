import {
  currentMonthISO,
  longDateUz,
  relativeDayUz,
  todayISO,
  weekStartISO,
} from '../src/lib/dates';
import { hadithOfTheDay, HADITHS } from '../src/lib/hadith';

describe('todayISO', () => {
  it('uses Tashkent, not the device timezone', () => {
    // 22:30 UTC is already the next day in Tashkent (UTC+5).
    expect(todayISO(new Date('2026-07-30T22:30:00Z'))).toBe('2026-07-31');
  });
});

describe('weekStartISO', () => {
  it.each([
    ['2026-07-27T09:00:00+05:00', '2026-07-27'], // Monday
    ['2026-07-30T09:00:00+05:00', '2026-07-27'], // Thursday
    ['2026-08-02T09:00:00+05:00', '2026-07-27'], // Sunday
  ])('maps %s to %s', (input, expected) => {
    expect(weekStartISO(new Date(input))).toBe(expected);
  });
});

describe('currentMonthISO', () => {
  it('returns YYYY-MM', () => {
    expect(currentMonthISO(new Date('2026-07-31T09:00:00+05:00'))).toBe('2026-07');
  });
});

describe('longDateUz', () => {
  it('renders an uppercase Uzbek weekday and month', () => {
    expect(longDateUz(new Date('2026-07-31T09:00:00+05:00'))).toBe('JUMA, 31-IYUL');
  });
});

describe('relativeDayUz', () => {
  const today = '2026-07-31';

  it('labels today and yesterday', () => {
    expect(relativeDayUz('2026-07-31', today)).toBe('BUGUN');
    expect(relativeDayUz('2026-07-30', today)).toBe('KECHA');
  });

  it('falls back to a day-month label', () => {
    expect(relativeDayUz('2026-07-28', today)).toBe('28-iyul');
  });
});

describe('hadithOfTheDay', () => {
  it('is stable for a given date', () => {
    expect(hadithOfTheDay('2026-07-31')).toEqual(hadithOfTheDay('2026-07-31'));
  });

  it('always returns a real entry', () => {
    for (const day of ['2026-01-01', '2026-07-31', '2026-12-31']) {
      expect(HADITHS).toContain(hadithOfTheDay(day));
    }
  });
});
