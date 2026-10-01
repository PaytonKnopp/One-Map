import { describe, expect, it } from 'vitest';

import {
  compareDates,
  durationDays,
  formatDate,
  isValidDate,
  toSortKey,
} from '../../src/core/calendar.ts';
import type { CalendarConfig } from '../../src/core/schema/world.ts';

const uniform: CalendarConfig = {
  eraBefore: 'BE',
  eraAfter: 'AE',
  epochYear: 0,
  months: Array.from({ length: 12 }, (_, i) => ({ name: `Month ${i + 1}`, days: 30 })),
  weekdays: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'],
  currentYear: 1000,
};

// A calendar with uneven month lengths, to prove toSortKey doesn't assume
// every month is the same size.
const uneven: CalendarConfig = {
  eraBefore: 'BE',
  eraAfter: 'AE',
  epochYear: 0,
  months: [
    { name: 'First', days: 31 },
    { name: 'Second', days: 28 },
    { name: 'Third', days: 31 },
  ],
  weekdays: ['Day 1', 'Day 2'],
  currentYear: 0,
};

describe('isValidDate', () => {
  it('accepts year-only, year+month, and full dates', () => {
    expect(isValidDate({ y: 240 }, uniform)).toBe(true);
    expect(isValidDate({ y: 240, m: 3 }, uniform)).toBe(true);
    expect(isValidDate({ y: 240, m: 3, d: 12 }, uniform)).toBe(true);
    expect(isValidDate({ y: -240, m: 12, d: 30 }, uniform)).toBe(true);
  });

  it('rejects out-of-range months and days', () => {
    expect(isValidDate({ y: 1, m: 13 }, uniform)).toBe(false);
    expect(isValidDate({ y: 1, m: 0 }, uniform)).toBe(false);
    expect(isValidDate({ y: 1, m: 1, d: 31 }, uniform)).toBe(false);
    expect(isValidDate({ y: 1, m: 2, d: 29 }, uneven)).toBe(false);
  });

  it('rejects a day given without a month', () => {
    expect(isValidDate({ y: 1, d: 5 }, uniform)).toBe(false);
  });
});

describe('toSortKey / compareDates', () => {
  it('treats the Epoch as day 0', () => {
    expect(toSortKey({ y: 0, m: 1, d: 1 }, uniform)).toBe(0);
  });

  it('orders a year-only date as that year’s first day', () => {
    expect(toSortKey({ y: 1 }, uniform)).toBe(toSortKey({ y: 1, m: 1, d: 1 }, uniform));
  });

  it('orders dates chronologically across years, months, and days', () => {
    expect(compareDates({ y: -1 }, { y: 0 }, uniform)).toBe(-1);
    expect(compareDates({ y: 1, m: 2 }, { y: 1, m: 3 }, uniform)).toBe(-1);
    expect(compareDates({ y: 1, m: 2, d: 5 }, { y: 1, m: 2, d: 6 }, uniform)).toBe(-1);
    expect(compareDates({ y: 5, m: 1, d: 1 }, { y: 5, m: 1, d: 1 }, uniform)).toBe(0);
  });

  it('accounts for uneven month lengths', () => {
    // Second month has 28 days, so day 1 of Third month is 31 + 28 = 59 days in.
    expect(toSortKey({ y: 0, m: 3, d: 1 }, uneven)).toBe(59);
  });
});

describe('durationDays', () => {
  it('is the day count between two dates', () => {
    expect(durationDays({ y: 0, m: 1, d: 1 }, { y: 1, m: 1, d: 1 }, uniform)).toBe(360);
    expect(durationDays({ y: 1, m: 1, d: 1 }, { y: 0, m: 1, d: 1 }, uniform)).toBe(-360);
  });
});

describe('formatDate', () => {
  it('formats with the precision the date actually has', () => {
    expect(formatDate({ y: 240 }, uniform)).toBe('240 AE');
    expect(formatDate({ y: -240 }, uniform)).toBe('240 BE');
    expect(formatDate({ y: 240, m: 3 }, uniform)).toBe('Month 3, 240 AE');
    expect(formatDate({ y: 240, m: 3, d: 12 }, uniform)).toBe('12 Month 3, 240 AE');
  });
});
