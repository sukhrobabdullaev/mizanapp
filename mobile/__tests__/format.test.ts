import {
  GROUP_SEPARATOR,
  formatAmount,
  formatClock,
  formatCompact,
  formatCountdown,
  formatMoney,
  formatPercent,
  formatSigned,
} from '../src/lib/format';

describe('formatAmount', () => {
  it('groups thousands the Uzbek way', () => {
    expect(formatAmount('1250000.00')).toBe(['1', '250', '000'].join(GROUP_SEPARATOR));
  });

  it('drops tiyin', () => {
    expect(formatAmount('999.99')).toBe('999');
  });

  it('handles zero', () => {
    expect(formatAmount('0.00')).toBe('0');
  });

  it('keeps the sign for negatives', () => {
    expect(formatAmount('-800000.00')).toBe(`-${['800', '000'].join(GROUP_SEPARATOR)}`);
  });

  it('never loses precision on large amounts', () => {
    // A float round-trip would render 9007199254740993 as ...992.
    expect(formatAmount('9007199254740993.00')).toBe(
      ['9', '007', '199', '254', '740', '993'].join(GROUP_SEPARATOR),
    );
  });

  it('accepts numbers too', () => {
    expect(formatAmount(1500)).toBe(['1', '500'].join(GROUP_SEPARATOR));
  });
});

describe('formatMoney / formatSigned', () => {
  it('appends the currency word', () => {
    expect(formatMoney('120000.00')).toBe(`${['120', '000'].join(GROUP_SEPARATOR)} so'm`);
  });

  it('falls back to the raw currency code', () => {
    expect(formatMoney('100.00', 'USD')).toBe('100 USD');
  });

  it('signs income and expense', () => {
    expect(formatSigned('1250000.00', 'income')).toBe(
      `+${['1', '250', '000'].join(GROUP_SEPARATOR)}`,
    );
    expect(formatSigned('150000.00', 'expense')).toBe(
      `-${['150', '000'].join(GROUP_SEPARATOR)}`,
    );
  });
});

describe('formatCompact', () => {
  it.each([
    ['800000', '800k'],
    ['1250000', '1.25M'],
    ['12000000', '12M'],
    ['500', '500'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatCompact(input)).toBe(expected);
  });
});

describe('formatPercent', () => {
  it('rounds to whole percents', () => {
    expect(formatPercent(0.7)).toBe('70%');
    expect(formatPercent(0.666)).toBe('67%');
  });
});

describe('formatClock', () => {
  it('pads hours and minutes', () => {
    expect(formatClock('2026-07-31T03:04:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('formatCountdown', () => {
  it('shows hours and minutes', () => {
    expect(formatCountdown(84 * 60_000)).toBe('1s 24d');
  });

  it('drops the hour part under an hour', () => {
    expect(formatCountdown(25 * 60_000)).toBe('25d');
  });

  it('clamps the past to zero', () => {
    expect(formatCountdown(-5000)).toBe('0d');
  });
});
