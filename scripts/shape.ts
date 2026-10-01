#!/usr/bin/env node
/** Generates a GeoJSON geometry — circle/rectangle/blob region, or a meandering route — and prints it to stdout (brief §10). Pipe it into `add -- --geometry-file -` or paste it by hand. */
import { parseArgs } from 'node:util';

import { planarDistanceMeters, worldUnitsToMeters } from '../src/core/geometry.ts';
import { blob, circle, meanderingRoute, rectangle, toCoordinates } from './lib/shapes.ts';
import { loadEntities, world } from './lib/entities.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    center: { type: 'string' },
    radius: { type: 'string' },
    width: { type: 'string' },
    height: { type: 'string' },
    roughness: { type: 'string', default: '0.3' },
    seed: { type: 'string', default: '1' },
    points: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    meander: { type: 'string', default: '0.1' },
  },
});

const kind = positionals[0];

if (values.help || !kind) {
  console.log(`Usage: npm run shape -- <circle|rectangle|blob|route> [options]

Prints a GeoJSON geometry (Polygon for circle/rectangle/blob, LineString
for route) to stdout, in world units (${world.scale.unit}).

  circle    --center <lng,lat|id> --radius <units> [--points 32]
  rectangle --center <lng,lat|id> --width <units> --height <units>
  blob      --center <lng,lat|id> --radius <units> [--roughness 0.3] [--seed 1] [--points 24]
  route     --from <lng,lat|id> --to <lng,lat|id> [--meander 0.1] [--seed 1] [--points 12]

--roughness/--meander are fractions of the radius/distance (0 = perfectly
smooth/straight). --seed makes the result reproducible — the same seed
always generates the same shape.
`);
  process.exit(values.help ? 0 : 1);
}

function resolvePoint(arg: string | undefined, flag: string): { lng: number; lat: number } {
  if (!arg) {
    console.error(`Missing --${flag}.`);
    process.exit(1);
  }
  if (arg.includes(',')) {
    const [lng, lat] = arg.split(',').map(Number);
    if (lng === undefined || lat === undefined || !Number.isFinite(lng) || !Number.isFinite(lat)) {
      console.error(`Invalid "lng,lat" for --${flag}: "${arg}"`);
      process.exit(1);
    }
    return { lng, lat };
  }
  const entity = loadEntities().get(arg);
  if (!entity?.spatial || entity.spatial.feature.geometry.type !== 'Point') {
    console.error(
      `"${arg}" (for --${flag}) isn't a known Point entity id, and isn't "lng,lat" either.`,
    );
    process.exit(1);
  }
  const [lng, lat] = entity.spatial.feature.geometry.coordinates;
  return { lng, lat };
}

function metersFromUnits(arg: string | undefined, flag: string): number {
  if (!arg || !Number.isFinite(Number(arg))) {
    console.error(`Missing or invalid --${flag} (expected a number of world units).`);
    process.exit(1);
  }
  return worldUnitsToMeters(Number(arg), world.scale.planeMetersPerUnit);
}

let geometry: { type: string; coordinates: unknown };

if (kind === 'circle') {
  const center = resolvePoint(values.center, 'center');
  const radius = metersFromUnits(values.radius, 'radius');
  const points = circle(center, radius, values.points ? Number(values.points) : undefined);
  geometry = { type: 'Polygon', coordinates: [toCoordinates(points)] };
} else if (kind === 'rectangle') {
  const center = resolvePoint(values.center, 'center');
  const width = metersFromUnits(values.width, 'width');
  const height = metersFromUnits(values.height, 'height');
  const points = rectangle(center, width, height);
  geometry = { type: 'Polygon', coordinates: [toCoordinates(points)] };
} else if (kind === 'blob') {
  const center = resolvePoint(values.center, 'center');
  const radius = metersFromUnits(values.radius, 'radius');
  const points = blob(
    center,
    radius,
    Number(values.roughness),
    Number(values.seed),
    values.points ? Number(values.points) : undefined,
  );
  geometry = { type: 'Polygon', coordinates: [toCoordinates(points)] };
} else if (kind === 'route') {
  const from = resolvePoint(values.from, 'from');
  const to = resolvePoint(values.to, 'to');
  const straightMeters = planarDistanceMeters(from, to);
  const meanderMeters = (Number(values.meander) || 0) * straightMeters;
  const points = meanderingRoute(
    from,
    to,
    meanderMeters,
    Number(values.seed),
    values.points ? Number(values.points) : undefined,
  );
  geometry = { type: 'LineString', coordinates: toCoordinates(points) };
} else {
  console.error(`Unknown shape "${kind}" — expected circle, rectangle, blob, or route.`);
  process.exit(1);
}

console.log(JSON.stringify(geometry, null, 2));
