#!/usr/bin/env node
/** Relocates an existing spatial entity (brief §10) — either to an exact point (Point geometries only) or by a planar offset (any geometry type). */
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import {
  destinationPoint,
  fromMercator,
  toMercator,
  worldUnitsToMeters,
} from '../src/core/geometry.ts';
import { formatJson } from './lib/canonical-json.ts';
import { loadEntities, world } from './lib/entities.ts';
import { readJson } from './lib/load-data.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    offset: { type: 'boolean' }, // switches to <id> --offset <distance> <bearing> mode
  },
});

if (values.help || positionals.length < 2) {
  console.log(`Usage: npm run move -- <id> <lng,lat>
       npm run move -- <id> --offset <distance> <bearing|direction>

The first form relocates a Point entity directly. The second translates
ANY geometry (Point/LineString/Polygon) by a planar distance (world
units, ${world.scale.unit}) and bearing/direction (n/ne/e/se/s/sw/w/nw
or degrees) — every coordinate in the geometry shifts by the same
planar vector, so a region or route keeps its shape.
`);
  process.exit(values.help ? 0 : 1);
}

const DIRECTIONS: Record<string, number> = {
  n: 0,
  ne: 45,
  e: 90,
  se: 135,
  s: 180,
  sw: 225,
  w: 270,
  nw: 315,
};

const id = positionals[0]!;
const entity = loadEntities().get(id);
if (!entity?.spatial) {
  console.error(`"${id}" isn't a known spatial entity.`);
  process.exit(1);
}

const { path, feature } = entity.spatial;
interface RawFeature {
  properties: { id: string };
  geometry: { type: string; coordinates: unknown };
}
const collection = readJson(path) as { features: RawFeature[] };
const target = collection.features.find((f) => f.properties.id === id);
if (!target) {
  console.error(`Internal error: couldn't find "${id}" in ${path} again.`);
  process.exit(1);
}

if (!values.offset) {
  if (feature.geometry.type !== 'Point') {
    console.error(
      `"${id}" isn't a Point entity — use --offset <distance> <bearing> to move a ${feature.geometry.type}.`,
    );
    process.exit(1);
  }
  const [lng, lat] = positionals[1]!.split(',').map(Number);
  if (lng === undefined || lat === undefined || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    console.error(`Invalid "lng,lat": "${positionals[1]}"`);
    process.exit(1);
  }
  target.geometry.coordinates = [lng, lat];
} else {
  const [distanceArg, bearingArg] = [positionals[1], positionals[2]];
  if (!distanceArg || !bearingArg) {
    console.error('Need --offset <distance> <bearing|direction>.');
    process.exit(1);
  }
  const distanceUnits = Number(distanceArg);
  const bearing = DIRECTIONS[bearingArg.toLowerCase()] ?? Number(bearingArg);
  if (!Number.isFinite(distanceUnits) || !Number.isFinite(bearing)) {
    console.error('Invalid distance or bearing/direction.');
    process.exit(1);
  }
  const distanceMeters = worldUnitsToMeters(distanceUnits, world.scale.planeMetersPerUnit);
  // The planar mercator delta a single offset represents — applied
  // identically to every coordinate, so a shape's size/orientation is preserved.
  const origin = toMercator({ lng: 0, lat: 0 });
  const shifted = toMercator(destinationPoint({ lng: 0, lat: 0 }, distanceMeters, bearing));
  const dx = shifted.x - origin.x;
  const dy = shifted.y - origin.y;

  function shiftCoord(coord: [number, number]): [number, number] {
    const m = toMercator({ lng: coord[0], lat: coord[1] });
    const moved = fromMercator({ x: m.x + dx, y: m.y + dy });
    return [Math.round(moved.lng * 1e6) / 1e6, Math.round(moved.lat * 1e6) / 1e6];
  }

  function shiftDeep(coords: unknown): unknown {
    if (Array.isArray(coords) && typeof coords[0] === 'number') {
      return shiftCoord(coords as [number, number]);
    }
    return (coords as unknown[]).map(shiftDeep);
  }

  target.geometry.coordinates = shiftDeep(target.geometry.coordinates);
}

writeFileSync(path, formatJson(collection), 'utf8');
console.log(
  `Moved "${id}". Run \`npm run validate\` next (and \`npm run snapshot\` to look at it).`,
);
