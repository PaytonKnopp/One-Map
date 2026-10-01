/**
 * Planar geometry on the world's flat canvas.
 *
 * The canvas is the full Web-Mercator (EPSG:3857) extent, treated as a
 * uniform Cartesian plane. GeoJSON coordinates stay ordinary [lng, lat] so
 * standard tools (QGIS, geojson.io, tippecanoe) can open the data, but all
 * distance/area/bearing math here projects to EPSG:3857 meters first and
 * then does plain Euclidean geometry — never geodesic/haversine. This is
 * deliberate: it is the same projection MapLibre renders with, so equal
 * world-distances always look equal on screen, at any position on the map.
 *
 * This is the ONLY implementation of this math in the project; both the
 * viewer (src/) and the CLI scripts (scripts/) import it from here.
 */

/** WGS84 semi-major axis, the radius EPSG:3857 is defined against. */
const EARTH_RADIUS_M = 6378137;

/** Standard Web Mercator latitude limit (where y would otherwise diverge). */
const MAX_LATITUDE = 85.05112878;

export interface LngLat {
  lng: number;
  lat: number;
}

export interface MercatorPoint {
  x: number;
  y: number;
}

function clampLatitude(lat: number): number {
  return Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
}

/** Projects [lng, lat] to EPSG:3857 meters. */
export function toMercator({ lng, lat }: LngLat): MercatorPoint {
  const clampedLat = clampLatitude(lat);
  const x = (lng * Math.PI * EARTH_RADIUS_M) / 180;
  const y = EARTH_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 360));
  return { x, y };
}

/** Inverse-projects EPSG:3857 meters back to [lng, lat]. */
export function fromMercator({ x, y }: MercatorPoint): LngLat {
  const lng = (x * 180) / (Math.PI * EARTH_RADIUS_M);
  const lat = (2 * Math.atan(Math.exp(y / EARTH_RADIUS_M)) - Math.PI / 2) * (180 / Math.PI);
  return { lng, lat };
}

/** Planar Euclidean distance between two points, in EPSG:3857 meters. */
export function planarDistanceMeters(a: LngLat, b: LngLat): number {
  const pa = toMercator(a);
  const pb = toMercator(b);
  return Math.hypot(pb.x - pa.x, pb.y - pa.y);
}

/** Converts a planar meter distance to world units using the world's scale. */
export function metersToWorldUnits(meters: number, planeMetersPerUnit: number): number {
  return meters / planeMetersPerUnit;
}

/** Converts a world-unit distance to planar meters using the world's scale. */
export function worldUnitsToMeters(units: number, planeMetersPerUnit: number): number {
  return units * planeMetersPerUnit;
}

/**
 * Planar bearing from `a` to `b`, in degrees clockwise from north
 * (0 = north, 90 = east, 180 = south, 270 = west), computed on the
 * EPSG:3857 plane — not a geodesic initial bearing.
 */
export function planarBearingDegrees(a: LngLat, b: LngLat): number {
  const pa = toMercator(a);
  const pb = toMercator(b);
  const degrees = (Math.atan2(pb.x - pa.x, pb.y - pa.y) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/**
 * The point reached from `origin` after travelling `distanceMeters` on the
 * EPSG:3857 plane along `bearingDegrees` (clockwise from north).
 */
export function destinationPoint(
  origin: LngLat,
  distanceMeters: number,
  bearingDegrees: number,
): LngLat {
  const p = toMercator(origin);
  const theta = (bearingDegrees * Math.PI) / 180;
  return fromMercator({
    x: p.x + distanceMeters * Math.sin(theta),
    y: p.y + distanceMeters * Math.cos(theta),
  });
}

/** Total planar length of a line (GeoJSON LineString coordinates), in meters. */
export function lineLengthMeters(coordinates: readonly [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const prevCoord = coordinates[i - 1]!;
    const currCoord = coordinates[i]!;
    const prev: LngLat = { lng: prevCoord[0], lat: prevCoord[1] };
    const curr: LngLat = { lng: currCoord[0], lat: currCoord[1] };
    total += planarDistanceMeters(prev, curr);
  }
  return total;
}

/**
 * Planar area of a closed GeoJSON ring (shoelace formula on EPSG:3857
 * meters), in square meters. Expects the GeoJSON convention of a ring whose
 * first and last coordinates are equal; always returns a non-negative value
 * regardless of winding order.
 */
export function ringAreaSquareMeters(ring: readonly [number, number][]): number {
  if (ring.length < 4) return 0;
  const points = ring.map(([lng, lat]) => toMercator({ lng, lat }));
  let sum = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Planar area of a GeoJSON polygon (outer ring minus holes), in square
 * meters.
 */
export function polygonAreaSquareMeters(rings: readonly (readonly [number, number][])[]): number {
  const [outer, ...holes] = rings;
  if (!outer) return 0;
  const outerArea = ringAreaSquareMeters(outer);
  const holesArea = holes.reduce((sum, hole) => sum + ringAreaSquareMeters(hole), 0);
  return Math.max(0, outerArea - holesArea);
}

/**
 * The area-weighted centroid of a closed ring (planar, EPSG:3857), used to
 * place a region's label. Falls back to the plain average of vertices for
 * a degenerate (zero-area) ring, so it never divides by zero.
 */
export function ringCentroid(ring: readonly [number, number][]): LngLat {
  const points = ring.map(([lng, lat]) => toMercator({ lng, lat }));
  let signedAreaSum = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const cross = p1.x * p2.y - p2.x * p1.y;
    signedAreaSum += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }

  if (signedAreaSum === 0) {
    const n = Math.max(1, points.length - 1);
    const avgX = points.slice(0, n).reduce((sum, p) => sum + p.x, 0) / n;
    const avgY = points.slice(0, n).reduce((sum, p) => sum + p.y, 0) / n;
    return fromMercator({ x: avgX, y: avgY });
  }

  const signedArea = signedAreaSum / 2;
  return fromMercator({ x: cx / (6 * signedArea), y: cy / (6 * signedArea) });
}
