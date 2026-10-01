#!/usr/bin/env node
/** Scaffolds a new (typically nested, brief §4.4) map: map.json + a starter layer. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { formatJson } from './lib/canonical-json.ts';
import { loadEntities } from './lib/entities.ts';
import { readJson } from './lib/load-data.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    name: { type: 'string' },
    'parent-entity': { type: 'string' },
    unit: { type: 'string', default: 'm' },
    'plane-meters-per-unit': { type: 'string', default: '1' },
    center: { type: 'string', default: '0,0' },
    zoom: { type: 'string', default: '15' },
    'half-size': { type: 'string', default: '0.01' }, // degrees, matches the sample nested map
    theme: { type: 'string' },
  },
});

const id = positionals[0];
if (values.help || !id) {
  console.log(`Usage: npm run new-map -- <id> [options]

Scaffolds data/maps/<id>/map.json plus an empty "places" layer folder.

  --name <name>              (default: the id)
  --parent-entity <id>       Nests this map under a spatial entity (brief §4.4) — also sets that entity's own "map" field to point back.
  --unit <unit>              (default: "m")
  --plane-meters-per-unit <n>  (default: 1)
  --center <lng,lat>         (default: "0,0")
  --zoom <n>                 (default: 15)
  --half-size <degrees>      Bounds = center +/- this (default: 0.01, ~1km)
  --theme <id>               (default: unset — inherits the world default)
`);
  process.exit(values.help ? 0 : 1);
}

const mapDir = `data/maps/${id}`;
if (existsSync(`${mapDir}/map.json`)) {
  console.error(`"${mapDir}/map.json" already exists.`);
  process.exit(1);
}

if (values['parent-entity']) {
  const parent = loadEntities().get(values['parent-entity']);
  if (!parent?.spatial) {
    console.error(`--parent-entity "${values['parent-entity']}" isn't a known spatial entity.`);
    process.exit(1);
  }
}

const [centerLng, centerLat] = values.center.split(',').map(Number);
const halfSize = Number(values['half-size']);

const mapConfig: Record<string, unknown> = {
  schemaVersion: 1,
  id,
  name: values.name ?? id,
  unit: values.unit,
  planeMetersPerUnit: Number(values['plane-meters-per-unit']),
  defaultView: { center: [centerLng, centerLat], zoom: Number(values.zoom) },
  bounds: [
    [centerLng! - halfSize, centerLat! - halfSize],
    [centerLng! + halfSize, centerLat! + halfSize],
  ],
  layers: [{ id: 'places', name: 'Places', types: ['place'], defaultVisible: true, zIndex: 0 }],
};
if (values['parent-entity']) mapConfig.parentEntity = values['parent-entity'];
if (values.theme) mapConfig.theme = values.theme;

mkdirSync(`${mapDir}/layers/places`, { recursive: true });
writeFileSync(`${mapDir}/map.json`, formatJson(mapConfig), 'utf8');
console.log(`Created ${mapDir}/map.json and ${mapDir}/layers/places/.`);

if (values['parent-entity']) {
  const parent = loadEntities().get(values['parent-entity'])!;
  const { path } = parent.spatial!;
  const collection = readJson(path) as { features: { properties: { id: string; map?: string } }[] };
  const feature = collection.features.find((f) => f.properties.id === values['parent-entity']);
  if (feature) {
    feature.properties.map = id;
    writeFileSync(path, formatJson(collection), 'utf8');
    console.log(`Set "${values['parent-entity']}".map = "${id}" in ${path}.`);
  }
}

console.log('\nRun `npm run format:data && npm run validate` next.');
