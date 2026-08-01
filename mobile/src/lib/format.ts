/** Uzbek formatting helpers. Money never round-trips through a float. */

/** Non-breaking space so an amount never wraps mid-number. */
export const GROUP_SEPARATOR = ' ';

/**
 * Formats a decimal string as UZS: `"1250000.00"` -> `"1 250 000"`.
 * Fractional so'm are dropped — nobody prices in tiyin.
 */
export function formatAmount(value: string | number): string {
  const raw = typeof value === 'number' ? value.toFixed(2) : value;
  const negative = raw.trim().startsWith('-');
  const [whole = '0'] = raw.replace('-', '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  return negative ? `-${grouped}` : grouped;
}

export function formatMoney(value: string | number, currency = 'UZS'): string {
  const suffix = currency === 'UZS' ? "so'm" : currency;
  return `${formatAmount(value)} ${suffix}`;
}

export function formatSigned(value: string | number, type: 'income' | 'expense'): string {
  const sign = type === 'income' ? '+' : '-';
  return `${sign}${formatAmount(value)}`;
}

/** `"1250000"` -> `"1.25M"` for the donut centre label. */
export function formatCompact(value: string | number): string {
  const amount = Math.abs(Number(value));
  if (!Number.isFinite(amount)) return '0';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 2)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(Math.round(amount));
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** `"2026-07-31T03:24:00+05:00"` -> `"03:24"`. */
export function formatClock(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Milliseconds -> `"1s 24d"`, the prayer countdown format. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '0d';
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}s ${minutes}d` : `${minutes}d`;
}
