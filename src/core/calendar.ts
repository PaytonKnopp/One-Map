import type { CalendarConfig } from './schema/world.ts';

/**
 * A structured in-world date. Never a formatted string — renaming months or
 * changing the calendar's weekday/month layout must never invalidate stored
 * data. `m` and `d` are 1-indexed and optional (open-ended precision);
 * negative `y` means before the Epoch (year 0).
 */
export interface DateKey {
  y: number;
  // `| undefined` (not just `?:`) so this stays structurally assignable
  // from Zod's inferred DateKeySchema output under exactOptionalPropertyTypes.
  m?: number | undefined;
  d?: number | undefined;
}

function daysPerYear(calendar: CalendarConfig): number {
  return calendar.months.reduce((sum, month) => sum + month.days, 0);
}

/**
 * Whether `date` is structurally valid for `calendar`: month in range, and
 * day in range for that month's length.
 */
export function isValidDate(date: DateKey, calendar: CalendarConfig): boolean {
  if (!Number.isInteger(date.y)) return false;
  if (date.m === undefined) return date.d === undefined;
  if (!Number.isInteger(date.m) || date.m < 1 || date.m > calendar.months.length) return false;
  if (date.d === undefined) return true;
  const month = calendar.months[date.m - 1]!;
  return Number.isInteger(date.d) && date.d >= 1 && date.d <= month.days;
}

/**
 * A sortable number of days since the Epoch (year 0, month 1, day 1).
 * Missing `m`/`d` are treated as 1 (the start of the year/month) — so a
 * year-only date sorts as that year's first day. Comparing two dates with
 * different precision therefore compares their *earliest possible* instant.
 */
export function toSortKey(date: DateKey, calendar: CalendarConfig): number {
  const perYear = daysPerYear(calendar);
  const m = date.m ?? 1;
  const d = date.d ?? 1;
  let daysIntoYear = d - 1;
  for (let i = 0; i < m - 1; i++) {
    daysIntoYear += calendar.months[i]!.days;
  }
  return date.y * perYear + daysIntoYear;
}

/** -1 if `a` is before `b`, 1 if after, 0 if their sort keys are equal. */
export function compareDates(a: DateKey, b: DateKey, calendar: CalendarConfig): -1 | 0 | 1 {
  const diff = toSortKey(a, calendar) - toSortKey(b, calendar);
  if (diff < 0) return -1;
  if (diff > 0) return 1;
  return 0;
}

/** Whole days between two dates (`b` minus `a`), using each date's earliest instant. */
export function durationDays(a: DateKey, b: DateKey, calendar: CalendarConfig): number {
  return toSortKey(b, calendar) - toSortKey(a, calendar);
}

/**
 * Human-readable rendering, e.g. "12 Month 3, 240 AE" or "240 BE" for a
 * year-only date before the Epoch. Precision follows what the date actually
 * specifies — a year-only date never gets a fabricated month/day.
 */
export function formatDate(date: DateKey, calendar: CalendarConfig): string {
  const era = date.y < 0 ? calendar.eraBefore : calendar.eraAfter;
  const absYear = Math.abs(date.y);

  if (date.m === undefined) {
    return `${absYear} ${era}`;
  }
  const month = calendar.months[date.m - 1];
  const monthName = month?.name ?? `Month ${date.m}`;

  if (date.d === undefined) {
    return `${monthName}, ${absYear} ${era}`;
  }
  return `${date.d} ${monthName}, ${absYear} ${era}`;
}
