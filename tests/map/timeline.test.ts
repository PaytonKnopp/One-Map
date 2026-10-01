import { describe, expect, it } from 'vitest';

import {
  isCurrentAtYear,
  OPEN_END,
  OPEN_START,
  featureTimelineKeys,
} from '../../src/map/timeline.ts';
import type { SpatialFeature } from '../../src/core/schema/entity.ts';
import type { CalendarConfig } from '../../src/core/schema/world.ts';

const calendar: CalendarConfig = {
  eraBefore: 'BE',
  eraAfter: 'AE',
  epochYear: 0,
  months: [{ name: 'Month 1', days: 30 }],
  weekdays: ['Day 1'],
  currentYear: 1000,
};

function place(from?: { y: number }, to?: { y: number }): SpatialFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: {
      id: 'x',
      type: 'place',
      status: 'canon',
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  } as SpatialFeature;
}

describe('featureTimelineKeys', () => {
  it('uses the sentinels for an entirely timeless entity', () => {
    const keys = featureTimelineKeys(place(), calendar);
    expect(keys.from).toBe(OPEN_START);
    expect(keys.to).toBe(OPEN_END);
  });

  it('uses the real sort key for a dated entity, sentinel for the open side', () => {
    const keys = featureTimelineKeys(place({ y: 100 }), calendar);
    expect(keys.from).toBeGreaterThan(OPEN_START);
    expect(keys.to).toBe(OPEN_END);
  });
});

describe('isCurrentAtYear', () => {
  it('is always true for a timeless entity', () => {
    expect(isCurrentAtYear(place(), -5000, calendar)).toBe(true);
    expect(isCurrentAtYear(place(), 5000, calendar)).toBe(true);
  });

  it('respects from/to bounds', () => {
    const f = place({ y: 100 }, { y: 200 });
    expect(isCurrentAtYear(f, 50, calendar)).toBe(false);
    expect(isCurrentAtYear(f, 150, calendar)).toBe(true);
    expect(isCurrentAtYear(f, 250, calendar)).toBe(false);
  });

  it('is open-ended on whichever side has no date', () => {
    const fromOnly = place({ y: 100 });
    expect(isCurrentAtYear(fromOnly, 100, calendar)).toBe(true);
    expect(isCurrentAtYear(fromOnly, 9000, calendar)).toBe(true);
    expect(isCurrentAtYear(fromOnly, 50, calendar)).toBe(false);
  });
});
