import { describe, expect, it } from 'vitest';

import {
  destinationPoint,
  fromMercator,
  lineLengthMeters,
  metersToWorldUnits,
  planarBearingDegrees,
  planarDistanceMeters,
  pointInPolygonRings,
  pointInRing,
  polygonAreaSquareMeters,
  ringAreaSquareMeters,
  ringCentroid,
  toMercator,
  worldUnitsToMeters,
} from '../../src/core/geometry.ts';

const METERS_PER_DEGREE_AT_EQUATOR = (6378137 * Math.PI) / 180;

describe('toMercator / fromMercator', () => {
  it('round-trips an arbitrary point', () => {
    const original = { lng: 12.3456, lat: -45.6789 };
    const roundTripped = fromMercator(toMercator(original));
    expect(roundTripped.lng).toBeCloseTo(original.lng, 9);
    expect(roundTripped.lat).toBeCloseTo(original.lat, 9);
  });

  it('maps the origin to the mercator origin', () => {
    const p = toMercator({ lng: 0, lat: 0 });
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
  });
});

describe('planarDistanceMeters', () => {
  it('matches the known meters-per-degree constant along the equator', () => {
    const d = planarDistanceMeters({ lng: 0, lat: 0 }, { lng: 1, lat: 0 });
    expect(d).toBeCloseTo(METERS_PER_DEGREE_AT_EQUATOR, 3);
  });

  it('is zero for coincident points', () => {
    expect(planarDistanceMeters({ lng: 5, lat: 5 }, { lng: 5, lat: 5 })).toBe(0);
  });
});

describe('planarBearingDegrees', () => {
  it('is 0 due north, 90 due east, 180 due south, 270 due west', () => {
    expect(planarBearingDegrees({ lng: 0, lat: 0 }, { lng: 0, lat: 1 })).toBeCloseTo(0, 6);
    expect(planarBearingDegrees({ lng: 0, lat: 0 }, { lng: 1, lat: 0 })).toBeCloseTo(90, 6);
    expect(planarBearingDegrees({ lng: 0, lat: 0 }, { lng: 0, lat: -1 })).toBeCloseTo(180, 6);
    expect(planarBearingDegrees({ lng: 0, lat: 0 }, { lng: -1, lat: 0 })).toBeCloseTo(270, 6);
  });
});

describe('destinationPoint', () => {
  it('is the inverse of planarDistanceMeters + planarBearingDegrees', () => {
    const origin = { lng: 10, lat: 20 };
    const distance = 54321;
    const bearing = 137;
    const dest = destinationPoint(origin, distance, bearing);
    expect(planarDistanceMeters(origin, dest)).toBeCloseTo(distance, 3);
    expect(planarBearingDegrees(origin, dest)).toBeCloseTo(bearing, 6);
  });

  it('travels due east by exactly the given distance at the equator', () => {
    const dest = destinationPoint({ lng: 0, lat: 0 }, METERS_PER_DEGREE_AT_EQUATOR, 90);
    expect(dest.lng).toBeCloseTo(1, 6);
    expect(dest.lat).toBeCloseTo(0, 6);
  });
});

describe('lineLengthMeters', () => {
  it('sums consecutive segment lengths', () => {
    const coords: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ];
    const expected =
      planarDistanceMeters({ lng: 0, lat: 0 }, { lng: 1, lat: 0 }) +
      planarDistanceMeters({ lng: 1, lat: 0 }, { lng: 1, lat: 1 });
    expect(lineLengthMeters(coords)).toBeCloseTo(expected, 3);
  });

  it('is 0 for a single point or empty line', () => {
    expect(lineLengthMeters([[0, 0]])).toBe(0);
    expect(lineLengthMeters([])).toBe(0);
  });
});

describe('ringAreaSquareMeters / polygonAreaSquareMeters', () => {
  it('computes the area of an exact square built from destinationPoint', () => {
    const origin = { lng: 0, lat: 0 };
    const side = 10_000; // meters
    const ne = destinationPoint(origin, side, 90);
    const se = destinationPoint(ne, side, 180);
    const sw = destinationPoint(se, side, 270);
    const ring: [number, number][] = [
      [origin.lng, origin.lat],
      [ne.lng, ne.lat],
      [se.lng, se.lat],
      [sw.lng, sw.lat],
      [origin.lng, origin.lat],
    ];
    expect(ringAreaSquareMeters(ring)).toBeCloseTo(side * side, 0);
  });

  it('gives the same area regardless of winding order', () => {
    const ring: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ];
    const reversed = [...ring].reverse();
    expect(ringAreaSquareMeters(ring)).toBeCloseTo(ringAreaSquareMeters(reversed), 3);
  });

  it('subtracts hole area from outer ring area', () => {
    const outer: [number, number][] = [
      [0, 0],
      [0, 2],
      [2, 2],
      [2, 0],
      [0, 0],
    ];
    const hole: [number, number][] = [
      [0.5, 0.5],
      [0.5, 1],
      [1, 1],
      [1, 0.5],
      [0.5, 0.5],
    ];
    const outerOnly = ringAreaSquareMeters(outer);
    const holeOnly = ringAreaSquareMeters(hole);
    expect(polygonAreaSquareMeters([outer, hole])).toBeCloseTo(outerOnly - holeOnly, 3);
  });
});

describe('ringCentroid', () => {
  it('is near the center of an axis-aligned square', () => {
    // Exact in x (mercator x is linear in lng); only approximate in y,
    // since mercator y is a nonlinear (log-tan) function of lat, so the
    // planar-mercator centroid isn't bit-identical to the plain lat average.
    const ring: [number, number][] = [
      [0, 0],
      [0, 2],
      [2, 2],
      [2, 0],
      [0, 0],
    ];
    const centroid = ringCentroid(ring);
    expect(centroid.lng).toBeCloseTo(1, 6);
    expect(centroid.lat).toBeCloseTo(1, 2);
  });

  it('gives the same centroid regardless of winding order', () => {
    const ring: [number, number][] = [
      [0, 0],
      [0, 2],
      [3, 2],
      [3, 0],
      [0, 0],
    ];
    const reversed = [...ring].reverse();
    const a = ringCentroid(ring);
    const b = ringCentroid(reversed);
    expect(a.lng).toBeCloseTo(b.lng, 6);
    expect(a.lat).toBeCloseTo(b.lat, 6);
  });

  it('is pulled toward the wider end of an asymmetric shape, unlike a plain vertex average', () => {
    // An "L" shape: a wide bottom bar with a narrow tower on the left.
    const lShape: [number, number][] = [
      [0, 0],
      [0, 3],
      [1, 3],
      [1, 1],
      [3, 1],
      [3, 0],
      [0, 0],
    ];
    const centroid = ringCentroid(lShape);
    // The plain average of the 6 distinct vertices would sit at x = 8/6 ≈ 1.33;
    // the area-weighted centroid should be pulled further toward the bottom bar.
    expect(centroid.lng).toBeLessThan(1.33);
  });
});

describe('world-unit conversions', () => {
  it('round-trips meters <-> world units', () => {
    expect(metersToWorldUnits(worldUnitsToMeters(42, 1000), 1000)).toBeCloseTo(42, 9);
  });
});

describe('pointInRing / pointInPolygonRings', () => {
  const square: [number, number][] = [
    [0, 0],
    [0, 2],
    [2, 2],
    [2, 0],
    [0, 0],
  ];

  it('is true for a point inside, false for one outside', () => {
    expect(pointInRing({ lng: 1, lat: 1 }, square)).toBe(true);
    expect(pointInRing({ lng: 5, lat: 5 }, square)).toBe(false);
  });

  it('pointInPolygonRings excludes points inside a hole', () => {
    const hole: [number, number][] = [
      [0.5, 0.5],
      [0.5, 1.5],
      [1.5, 1.5],
      [1.5, 0.5],
      [0.5, 0.5],
    ];
    const polygon = [square, hole];
    expect(pointInPolygonRings({ lng: 1, lat: 1 }, [polygon])).toBe(false); // inside the hole
    expect(pointInPolygonRings({ lng: 0.2, lat: 0.2 }, [polygon])).toBe(true); // inside the outer, outside the hole
    expect(pointInPolygonRings({ lng: 9, lat: 9 }, [polygon])).toBe(false); // outside entirely
  });
});
