import { destinationPoint, type LngLat } from '../../src/core/geometry.ts';

/** A tiny deterministic PRNG (mulberry32) — same seed always gives the same shape, so a generated coastline/river is reproducible (brief §10). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function circle(center: LngLat, radiusMeters: number, points = 32): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i <= points; i++) {
    const bearing = (360 * i) / points;
    ring.push(destinationPoint(center, radiusMeters, bearing));
  }
  return ring;
}

export function rectangle(center: LngLat, widthMeters: number, heightMeters: number): LngLat[] {
  const north = destinationPoint(center, heightMeters / 2, 0);
  const south = destinationPoint(center, heightMeters / 2, 180);
  const corners = [
    destinationPoint(north, widthMeters / 2, 270), // NW
    destinationPoint(north, widthMeters / 2, 90), // NE
    destinationPoint(south, widthMeters / 2, 90), // SE
    destinationPoint(south, widthMeters / 2, 270), // SW
  ];
  return [...corners, corners[0]!];
}

/**
 * An organic, roughly-circular ring (brief §10 — "natural-looking
 * coastlines and regions"): a sum of a few seeded sine harmonics
 * perturbing the radius at each angle, rather than independent per-point
 * noise, which would look jagged instead of organic.
 */
export function blob(
  center: LngLat,
  radiusMeters: number,
  roughness: number,
  seed: number,
  points = 24,
): LngLat[] {
  const rand = mulberry32(seed);
  const harmonics = [2, 3, 5].map((frequency) => ({
    frequency,
    phase: rand() * Math.PI * 2,
    amplitude: rand(),
  }));
  const amplitudeSum = harmonics.reduce((sum, h) => sum + h.amplitude, 0) || 1;

  const ring: LngLat[] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (2 * Math.PI * i) / points;
    const noise =
      harmonics.reduce((sum, h) => sum + h.amplitude * Math.sin(h.frequency * angle + h.phase), 0) /
      amplitudeSum;
    const radius = radiusMeters * (1 + roughness * noise);
    const bearing = (angle * 180) / Math.PI;
    ring.push(destinationPoint(center, radius, bearing));
  }
  return ring;
}

/**
 * A meandering line between two points (brief §10 — "generate a
 * meandering river/route between points"): intermediate points nudged
 * perpendicular to the straight line by a seeded random amount, scaled by
 * `meander` and tapered to zero at both ends so the endpoints land exactly
 * on `from`/`to`.
 */
export function meanderingRoute(
  from: LngLat,
  to: LngLat,
  meanderMeters: number,
  seed: number,
  points = 12,
): LngLat[] {
  const rand = mulberry32(seed);
  const bearing = Math.atan2(to.lng - from.lng, to.lat - from.lat) * (180 / Math.PI);
  const perpendicular = bearing + 90;

  const line: LngLat[] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const base: LngLat = {
      lng: from.lng + (to.lng - from.lng) * t,
      lat: from.lat + (to.lat - from.lat) * t,
    };
    if (i === 0 || i === points) {
      line.push(base);
      continue;
    }
    const taper = Math.sin(Math.PI * t); // 0 at both ends, 1 at the midpoint
    const offset = (rand() * 2 - 1) * meanderMeters * taper;
    line.push(
      destinationPoint(base, Math.abs(offset), offset >= 0 ? perpendicular : perpendicular + 180),
    );
  }
  return line;
}

export function toCoordinates(points: LngLat[]): [number, number][] {
  return points.map((p) => [p.lng, p.lat]);
}
