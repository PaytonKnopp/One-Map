#!/usr/bin/env node
/** World distance (+ travel time, if configured) between two points or entities (brief §10). */
import { parseArgs } from 'node:util';

import { metersToWorldUnits, planarDistanceMeters } from '../src/core/geometry.ts';
import { loadEntities, world } from './lib/entities.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { help: { type: 'boolean', short: 'h' }, map: { type: 'string' } },
});

if (values.help || positionals.length < 2) {
  console.log(`Usage: npm run measure -- <id|lng,lat> <id|lng,lat> [--map <id>]

Prints the planar distance between two points or entities, in world
units (${world.scale.unit}), plus a travel-time estimate per
data/world.json's scale.travelSpeeds, if any are defined. Every map
has its own coordinate space (brief §4.4) — measuring between entities
on two different maps is refused, since the numbers wouldn't mean
anything.

  --map <id>   Which map a bare "lng,lat" argument belongs to (default: the world's defaultMap).
`);
  process.exit(values.help ? 0 : 1);
}

function resolve(arg: string): { lng: number; lat: number; mapId: string } {
  if (arg.includes(',')) {
    const [lng, lat] = arg.split(',').map(Number);
    if (lng === undefined || lat === undefined || !Number.isFinite(lng) || !Number.isFinite(lat)) {
      console.error(`Invalid "lng,lat": "${arg}"`);
      process.exit(1);
    }
    return { lng, lat, mapId: values.map ?? world.defaultMap };
  }
  const entity = loadEntities().get(arg);
  if (!entity?.spatial || entity.spatial.feature.geometry.type !== 'Point') {
    console.error(`"${arg}" isn't a known Point entity id, and isn't "lng,lat" either.`);
    process.exit(1);
  }
  const [lng, lat] = entity.spatial.feature.geometry.coordinates;
  return { lng, lat, mapId: entity.spatial.mapId };
}

const a = resolve(positionals[0]!);
const b = resolve(positionals[1]!);

if (a.mapId !== b.mapId) {
  console.error(
    `"${positionals[0]}" is on map "${a.mapId}" but "${positionals[1]}" is on map "${b.mapId}" — each map has its own coordinate space, so this distance wouldn't mean anything.`,
  );
  process.exit(1);
}

const meters = planarDistanceMeters(a, b);
const units = metersToWorldUnits(meters, world.scale.planeMetersPerUnit);

console.log(`${units.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${world.scale.unit}`);

for (const speed of world.scale.travelSpeeds ?? []) {
  const days = units / speed.unitsPerDay;
  console.log(
    `  ~${days.toLocaleString(undefined, { maximumFractionDigits: 1 })} days by ${speed.name}`,
  );
}
if (!world.scale.travelSpeeds?.length) {
  console.log("  (no travel speeds defined in data/world.json's scale.travelSpeeds yet)");
}
