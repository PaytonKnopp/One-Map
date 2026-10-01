#!/usr/bin/env node
/** Which region(s) contain a point, and the nearest entities to it (brief §10). */
import { parseArgs } from 'node:util';

import {
  metersToWorldUnits,
  planarDistanceMeters,
  pointInPolygonRings,
} from '../src/core/geometry.ts';
import { loadEntities, world, type Entity } from './lib/entities.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    nearest: { type: 'string', default: '5' },
    map: { type: 'string' },
  },
});

if (values.help || positionals.length < 2) {
  console.log(`Usage: npm run where -- <lng> <lat> [--map <id>] [--nearest <n>]

Prints which region(s) contain [lng, lat], and the n nearest spatial
entities (default 5), with planar distance in world units. Every map
has its own independent coordinate space (brief §4.4), so results are
scoped to one map — the world map by default.

  --map <id>      Which map's entities to search (default: the world's defaultMap).
  --nearest <n>   How many nearest entities to list (default 5).
`);
  process.exit(values.help ? 0 : 1);
}

const lng = Number(positionals[0]);
const lat = Number(positionals[1]);
if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
  console.error('lng/lat must be numbers.');
  process.exit(1);
}

const mapId = values.map ?? world.defaultMap;
const point = { lng, lat };
const inMap = (e: Entity) => e.spatial?.mapId === mapId;

const entities = Array.from(loadEntities().values()).filter(inMap);
if (entities.length === 0) {
  console.error(`No spatial entities found on map "${mapId}" (check the id, or pass --map).`);
  process.exit(1);
}

const regions = entities.filter((e) => {
  const geometry = e.spatial?.feature.geometry;
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return false;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return pointInPolygonRings(point, polygons);
});

console.log(
  regions.length > 0
    ? `Inside: ${regions.map((r) => r.id).join(', ')}`
    : 'Inside: (no region contains this point)',
);

const planeMetersPerUnit = world.scale.planeMetersPerUnit;
const withDistance = entities
  .filter((e) => e.spatial?.feature.geometry.type === 'Point')
  .map((e) => {
    const [elng, elat] = (e.spatial!.feature.geometry as { coordinates: [number, number] })
      .coordinates;
    const meters = planarDistanceMeters(point, { lng: elng, lat: elat });
    return { entity: e, units: metersToWorldUnits(meters, planeMetersPerUnit) };
  })
  .sort((a, b) => a.units - b.units);

const n = Number(values.nearest) || 5;
console.log(`\nNearest ${Math.min(n, withDistance.length)} entities on map "${mapId}":`);
for (const { entity, units } of withDistance.slice(0, n)) {
  console.log(`  ${entity.id}  ${units.toFixed(1)} ${world.scale.unit}`);
}
