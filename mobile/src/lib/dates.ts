/** Date helpers pinned to Asia/Tashkent, matching the backend's TIME_ZONE. */

import { format, startOfWeek } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const TZ = 'Asia/Tashkent';

const WEEKDAYS_UZ = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
] as const;

const MONTHS_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
] as const;

/** Today in Tashkent as `YYYY-MM-DD` (never the device timezone). */
export function todayISO(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, 'yyyy-MM-dd');
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Monday of the week containing `date`, as `YYYY-MM-DD`. */
export function weekStartISO(date: Date = new Date()): string {
  const zoned = toZonedTime(date, TZ);
  return format(startOfWeek(zoned, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function currentMonthISO(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, 'yyyy-MM');
}

/** `"DUSHANBA, 31-IYUL"` for the Bugun header. */
export function longDateUz(date: Date = new Date()): string {
  const zoned = toZonedTime(date, TZ);
  const weekday = WEEKDAYS_UZ[zoned.getDay()] ?? '';
  return `${weekday}, ${zoned.getDate()}-${MONTHS_UZ[zoned.getMonth()]}`.toUpperCase();
}

/** `"BUGUN"` / `"KECHA"` / `"29-iyul"` — transaction list day headers. */
export function relativeDayUz(iso: string, today: string = todayISO()): string {
  if (iso === today) return 'BUGUN';
  const yesterday = new Date(`${today}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === toISODate(yesterday)) return 'KECHA';
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getDate()}-${MONTHS_UZ[date.getMonth()]}`;
}

export function shortWeekdayUz(date: Date): string {
  return (WEEKDAYS_UZ[date.getDay()] ?? '').slice(0, 2);
}
