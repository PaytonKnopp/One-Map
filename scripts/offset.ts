#!/usr/bin/env node
/** Coordinates at a world-distance and direction from a point or entity (brief §10) — for placing something "2km north of Sampleton" without guessing. */
import { parseArgs } from 'node:util';

import { destinationPoint, worldUnitsToMeters } from '../src/core/geometry.ts';
import { loadEntities, world } from './lib/entities.ts';

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

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { help: { type: 'boolean', short: 'h' } },
});

if (values.help || positionals.length < 3) {
  console.log(`Usage: npm run offset -- <id|lng,lat> <distance> <bearing|direction>

Prints the [lng, lat] reached from a point or entity's location after
travelling <distance> world units (${world.scale.unit}) along
<bearing> (degrees clockwise from north) or a compass direction
(n, ne, e, se, s, sw, w, nw).

Examples:
  npm run offset -- sampleton 5 n
  npm run offset -- 1.5,0.3 12.5 135
`);
  process.exit(values.help ? 0 : 1);
}

const [originArg, distanceArg, bearingArg] = positionals as [string, string, string];

function resolveOrigin(arg: string): { lng: number; lat: number } {
  if (arg.includes(',')) {
    const [lng, lat] = arg.split(',').map(Number);
    if (lng === undefined || lat === undefined || !Number.isFinite(lng) || !Number.isFinite(lat)) {
      console.error(`Invalid "lng,lat": "${arg}"`);
      process.exit(1);
    }
    return { lng, lat };
  }
  const entity = loadEntities().get(arg);
  if (!entity?.spatial || entity.spatial.feature.geometry.type !== 'Point') {
    console.error(`"${arg}" isn't a known Point entity id, and isn't "lng,lat" either.`);
    process.exit(1);
  }
  const [lng, lat] = entity.spatial.feature.geometry.coordinates;
  return { lng, lat };
}

const origin = resolveOrigin(originArg);
const distanceUnits = Number(distanceArg);
if (!Number.isFinite(distanceUnits)) {
  console.error(`Invalid distance: "${distanceArg}"`);
  process.exit(1);
}

const bearing = DIRECTIONS[bearingArg.toLowerCase()] ?? Number(bearingArg);
if (!Number.isFinite(bearing)) {
  console.error(`Invalid bearing/direction: "${bearingArg}"`);
  process.exit(1);
}

const distanceMeters = worldUnitsToMeters(distanceUnits, world.scale.planeMetersPerUnit);
const result = destinationPoint(origin, distanceMeters, bearing);
console.log(`[${result.lng.toFixed(6)}, ${result.lat.toFixed(6)}]`);
