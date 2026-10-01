#!/usr/bin/env node
/** Prints an entity's full record: fields, geometry, lore path, relations, and computed backlinks (brief §10). */
import { parseArgs } from 'node:util';

import { loadEntities } from './lib/entities.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { help: { type: 'boolean', short: 'h' } },
});

if (values.help || positionals.length === 0) {
  console.log(`Usage: npm run show -- <id>

Prints the entity's full record: type/subtype, name/aliases, tags,
dates, geometry (if spatial) and which map/layer/file it's in, lore
file path, outgoing relations, and computed backlinks.
`);
  process.exit(values.help ? 0 : 1);
}

const id = positionals[0]!;
const entity = loadEntities().get(id);

if (!entity) {
  console.error(`No entity with id "${id}".`);
  process.exit(1);
}

console.log(`${entity.name}  (${entity.id})`);
console.log(
  `type: ${entity.type}${entity.subtype ? `/${entity.subtype}` : ''}  status: ${entity.status}`,
);
if (entity.aliases.length) console.log(`aliases: ${entity.aliases.join(', ')}`);
if (entity.tags.length) console.log(`tags: ${entity.tags.join(', ')}`);
if (entity.summary) console.log(`summary: ${entity.summary}`);
if (entity.from) console.log(`from: ${JSON.stringify(entity.from)}`);
if (entity.to) console.log(`to: ${JSON.stringify(entity.to)}`);
if (entity.date) console.log(`date: ${JSON.stringify(entity.date)}`);

if (entity.spatial) {
  const { feature, mapId, layerId, path } = entity.spatial;
  console.log(
    `\ngeometry: ${feature.geometry.type} ${JSON.stringify((feature.geometry as { coordinates: unknown }).coordinates)}`,
  );
  console.log(`map: ${mapId}  layer: ${layerId}  file: ${path}`);
}
if (entity.mapLink) console.log(`opens nested map: ${entity.mapLink}`);
if (entity.location.length) console.log(`shown at: ${entity.location.join(', ')}`);

if (entity.lore) console.log(`\nlore file: ${entity.lore.path}`);

if (entity.relations.length) {
  console.log('\nrelations (outgoing):');
  for (const r of entity.relations)
    console.log(`  ${r.type} -> ${r.target}${r.note ? ` (${r.note})` : ''}`);
}
if (entity.backlinks.length) {
  console.log('\nbacklinks (computed, incoming):');
  for (const b of entity.backlinks)
    console.log(`  ${b.type} <- ${b.sourceId}${b.note ? ` (${b.note})` : ''}`);
}
if (entity.lore) {
  console.log(`\n--- lore body (${entity.lore.path}) ---`);
  console.log(entity.lore.body);
}
