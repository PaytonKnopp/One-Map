#!/usr/bin/env node
/** Adds a new spatial entity (brief §10) — safe, canonically-formatted, maintains the layer file structure. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { toKebabCase } from '../src/core/ids.ts';
import { formatJson } from './lib/canonical-json.ts';
import { loadEntities } from './lib/entities.ts';
import { readJson } from './lib/load-data.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    map: { type: 'string' },
    layer: { type: 'string' },
    name: { type: 'string' },
    subtype: { type: 'string' },
    point: { type: 'string' },
    'geometry-file': { type: 'string' },
    rank: { type: 'string' },
    icon: { type: 'string' },
    summary: { type: 'string' },
    tags: { type: 'string' },
    status: { type: 'string', default: 'canon' },
    text: { type: 'string' },
    relation: { type: 'string', multiple: true },
    file: { type: 'string' },
  },
});

const [type, idArg] = positionals as [string | undefined, string | undefined];

if (values.help || !type || !idArg || !values.map || !values.layer) {
  console.log(`Usage: npm run add -- <type> <id> --map <mapId> --layer <layerId> [options]

Adds a new spatial entity. Exactly one of --point or --geometry-file is
required (the latter accepts a path, or "-" for stdin — pipe in
"npm run shape"'s output).

  --name <name>              Required unless --text is given (label).
  --subtype <subtype>
  --point <lng,lat>           For a simple Point entity (place/label).
  --geometry-file <path|->    A GeoJSON geometry (Polygon/LineString/Point) from shape or by hand.
  --rank <1-5>
  --icon <icon-id>
  --summary <text>
  --tags <a,b,c>
  --status <canon|draft|retired>   (default: canon)
  --text <text>                     label-type entities only.
  --relation <type:target>          Repeatable — e.g. --relation capital-of:sample-country
  --file <path>              Which .geojson file to write to (default: a new file named after the id).
`);
  process.exit(values.help ? 0 : 1);
}

const id = idArg;
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error(`"${id}" isn't kebab-case. Try: ${toKebabCase(id)}`);
  process.exit(1);
}
if (loadEntities().has(id)) {
  console.error(`"${id}" already exists.`);
  process.exit(1);
}

const entityTypes = readJson('data/registry/entity-types.json') as {
  spatial: Record<string, { subtypes: string[] }>;
};
const typeDef = entityTypes.spatial[type];
if (!typeDef) {
  console.error(
    `"${type}" isn't a registered spatial type. Known: ${Object.keys(entityTypes.spatial).join(', ')}`,
  );
  process.exit(1);
}
if (values.subtype && !typeDef.subtypes.includes(values.subtype)) {
  console.error(
    `"${values.subtype}" isn't a registered subtype of "${type}". Known: ${typeDef.subtypes.join(', ')}`,
  );
  process.exit(1);
}

const mapPath = `data/maps/${values.map}/map.json`;
if (!existsSync(mapPath)) {
  console.error(`No map "${values.map}" (expected ${mapPath}).`);
  process.exit(1);
}
const mapConfig = readJson(mapPath) as { layers: { id: string }[] };
if (!mapConfig.layers.some((l) => l.id === values.layer)) {
  console.error(`Layer "${values.layer}" isn't declared in ${mapPath}.`);
  process.exit(1);
}

if (!values.point && !values['geometry-file']) {
  console.error('Need --point <lng,lat> or --geometry-file <path|->.');
  process.exit(1);
}
if (values.point && values['geometry-file']) {
  console.error('Pass only one of --point or --geometry-file.');
  process.exit(1);
}

let geometry: { type: string; coordinates: unknown };
if (values.point) {
  const [lng, lat] = values.point.split(',').map(Number);
  if (lng === undefined || lat === undefined || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    console.error(`Invalid --point "${values.point}" (expected "lng,lat").`);
    process.exit(1);
  }
  geometry = { type: 'Point', coordinates: [lng, lat] };
} else {
  const source = values['geometry-file']!;
  const raw = source === '-' ? readFileSync(0, 'utf8') : readFileSync(source, 'utf8');
  geometry = JSON.parse(raw);
}

if (!values.name && !values.text) {
  console.error('Need --name (or --text, for a label entity).');
  process.exit(1);
}

const properties: Record<string, unknown> = { id, type };
if (values.subtype) properties.subtype = values.subtype;
if (values.name) properties.name = values.name;
if (values.text) properties.text = values.text;
if (values.summary) properties.summary = values.summary;
if (values.tags) properties.tags = values.tags.split(',').map((t) => t.trim());
if (values.rank) properties.rank = Number(values.rank);
if (values.icon) properties.icon = values.icon;
properties.status = values.status;
if (values.relation?.length) {
  properties.relations = values.relation.map((r) => {
    const [relType, target] = r.split(':');
    if (!relType || !target) {
      console.error(`Invalid --relation "${r}" (expected "type:target").`);
      process.exit(1);
    }
    return { type: relType, target };
  });
}

const feature = { type: 'Feature', geometry, properties };

const targetFile = values.file ?? `data/maps/${values.map}/layers/${values.layer}/${id}.geojson`;
let collection: { type: string; features: unknown[] };
if (existsSync(targetFile)) {
  collection = readJson(targetFile) as { type: string; features: unknown[] };
  collection.features.push(feature);
} else {
  collection = { type: 'FeatureCollection', features: [feature] };
}

writeFileSync(targetFile, formatJson(collection), 'utf8');
console.log(`Added "${id}" to ${targetFile}.`);
console.log('Run `npm run validate` next (and `npm run snapshot` if you want to look at it).');
