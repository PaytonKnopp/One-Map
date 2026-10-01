import { toSortKey } from '../core/calendar.ts';
import type { CalendarConfig } from '../core/schema/world.ts';
import type { SpatialFeature } from '../core/schema/entity.ts';

/**
 * Sentinels standing in for "no `from`"/"no `to`" (open-ended or entirely
 * timeless — brief §4.3) in MapLibre filter/paint expressions, which need
 * plain finite numbers, not Infinity. Comfortably outside any year a
 * calendar's sort key could reach.
 */
export const OPEN_START = -1e15;
export const OPEN_END = 1e15;

export interface TimelineSortKeys {
  from: number;
  to: number;
}

/** A feature's existence span as sortable numbers, open-ended ends filled with the sentinels above. */
export function featureTimelineKeys(
  feature: SpatialFeature,
  calendar: CalendarConfig,
): TimelineSortKeys {
  const { from, to } = feature.properties;
  return {
    from: from ? toSortKey(from, calendar) : OPEN_START,
    to: to ? toSortKey(to, calendar) : OPEN_END,
  };
}

/** Whether a feature exists at `viewedYear` (brief §4.3's "Now" is just a specific year). Year-only — matches the slider's year granularity. */
export function isCurrentAtYear(
  feature: SpatialFeature,
  viewedYear: number,
  calendar: CalendarConfig,
): boolean {
  const keys = featureTimelineKeys(feature, calendar);
  const yearKey = toSortKey({ y: viewedYear }, calendar);
  return keys.from <= yearKey && yearKey <= keys.to;
}
