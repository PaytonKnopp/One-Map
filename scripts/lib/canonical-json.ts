/**
 * Canonical JSON formatting shared by `npm run format:data` (writes) and
 * `npm run validate` (checks without writing) — one implementation, so the
 * two can never disagree about what "canonical" means.
 *
 * Rules (see docs/DATA_MODEL.md):
 *  - 2-space indent, trailing newline.
 *  - Object keys sorted alphabetically, recursively. Array order is never
 *    touched — array order is meaningful (month sequence, polygon rings,
 *    layer z-order, ...).
 *  - Every number found anywhere inside a "coordinates" key's subtree is
 *    rounded to 6 decimal places (~11cm at the equator; GeoJSON convention).
 *    Numbers outside "coordinates" are never altered.
 */

function roundTo6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function canonicalizeJsonValue(value: unknown, insideCoordinates = false): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJsonValue(item, insideCoordinates));
  }
  if (typeof value === 'number' && insideCoordinates) {
    return roundTo6(value);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      result[key] = canonicalizeJsonValue(record[key], insideCoordinates || key === 'coordinates');
    }
    return result;
  }
  return value;
}

export function formatJson(value: unknown): string {
  return `${JSON.stringify(canonicalizeJsonValue(value), null, 2)}\n`;
}
