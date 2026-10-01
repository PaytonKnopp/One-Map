import { describe, expect, it } from 'vitest';

import { planarDistanceMeters } from '../../src/core/geometry.ts';
import { blob, circle, meanderingRoute, rectangle } from '../../scripts/lib/shapes.ts';

const center = { lng: 10, lat: 20 };

describe('circle', () => {
  it('closes (first point equals last) and every point is the given radius away', () => {
    const ring = circle(center, 5000, 16);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const point of ring) {
      expect(planarDistanceMeters(center, point)).toBeCloseTo(5000, 0);
    }
  });
});

describe('rectangle', () => {
  it('produces a closed 4-corner ring centered on the given point', () => {
    const ring = rectangle(center, 2000, 1000);
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    // Opposite corners should be equidistant from center (NW vs SE, NE vs SW).
    expect(planarDistanceMeters(center, ring[0]!)).toBeCloseTo(
      planarDistanceMeters(center, ring[2]!),
      0,
    );
  });
});

describe('blob', () => {
  it('is deterministic for the same seed, different for a different seed', () => {
    const a = blob(center, 5000, 0.4, 42, 12);
    const b = blob(center, 5000, 0.4, 42, 12);
    const c = blob(center, 5000, 0.4, 7, 12);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('closes, and stays roughly within [radius*(1-roughness), radius*(1+roughness)]', () => {
    const ring = blob(center, 5000, 0.4, 1, 24);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const point of ring) {
      const d = planarDistanceMeters(center, point);
      expect(d).toBeGreaterThan(5000 * 0.55);
      expect(d).toBeLessThan(5000 * 1.45);
    }
  });
});

describe('meanderingRoute', () => {
  const from = { lng: 0, lat: 0 };
  const to = { lng: 2, lat: 0 };

  it('starts and ends exactly on the given points regardless of meander', () => {
    const line = meanderingRoute(from, to, 5000, 1, 10);
    expect(line[0]).toEqual(from);
    expect(line[line.length - 1]).toEqual(to);
  });

  it('is a straight line when meander is 0', () => {
    const line = meanderingRoute(from, to, 0, 1, 10);
    for (const point of line) {
      expect(point.lat).toBeCloseTo(0, 6);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = meanderingRoute(from, to, 5000, 99, 10);
    const b = meanderingRoute(from, to, 5000, 99, 10);
    expect(a).toEqual(b);
  });
});
