#!/usr/bin/env node
/**
 * Removes every entity tagged `sample` (brief §12/§16) — the seed content
 * meant to be thrown away once a real world starts. Defaults to a dry run;
 * --yes actually deletes. Any nested map whose parentEntity is a sample
 * entity is entirely sample content too, so its whole map folder goes with
 * it. Mirrors delete.ts's per-entity removal and dangling-reference report.
 */
import { existsSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { formatJson } from './lib/canonical-json.ts';
import { loadEntities } from './lib/entities.ts';
import { listMapIds, readJson } from './lib/load-data.ts';
import { loadLoreFiles, wikiLinkTargets } from './lib/load-lore.ts';

const { values } = parseArgs({
  options: { help: { type: 'boolean', short: 'h' }, yes: { type: 'boolean' } },
});

if (values.help) {
  console.log(`Usage: npm run clear-sample -- [--yes]

Deletes every entity tagged "sample": its spatial feature (removing the
.geojson file if it becomes empty) and/or lore file. Any nested map whose
parentEntity is one of those entities is sample content too, so the whole
map folder (map.json + layers/) is removed as well.

Without --yes, only prints what would be deleted. Reports (doesn't
auto-fix) any dangling reference left behind.
`);
  process.exit(0);
}

const entities = loadEntities();
const sampleIds = new Set(
  [...entities.values()].filter((e) => e.tags.includes('sample')).map((e) => e.id),
);

if (sampleIds.size === 0) {
  console.log('No entity is tagged "sample" — nothing to clear.');
  process.exit(0);
}

const sampleMapIds = listMapIds().filter((mapId) => {
  const mapConfig = readJson(`data/maps/${mapId}/map.json`) as { parentEntity?: string };
  return mapConfig.parentEntity !== undefined && sampleIds.has(mapConfig.parentEntity);
});

console.log(`Entities tagged "sample" (${sampleIds.size}): ${[...sampleIds].join(', ')}`);
if (sampleMapIds.length > 0) {
  console.log(
    `Nested map(s) entirely under a sample entity (${sampleMapIds.length}): ${sampleMapIds.join(', ')}`,
  );
}

if (!values.yes) {
  console.log('\nDry run — nothing deleted. Re-run with --yes to actually clear this.');
  process.exit(0);
}

for (const id of sampleIds) {
  const entity = entities.get(id)!;

  if (entity.spatial) {
    const { path } = entity.spatial;
    const collection = readJson(path) as { features: { properties: { id: string } }[] };
    collection.features = collection.features.filter((f) => f.properties.id !== id);
    if (collection.features.length === 0) {
      unlinkSync(path);
      console.log(`Deleted "${id}" and removed now-empty ${path}.`);
    } else {
      writeFileSync(path, formatJson(collection), 'utf8');
      console.log(`Deleted "${id}" from ${path}.`);
    }
  }
  if (entity.lore && (!entity.spatial || entity.lore.path !== entity.spatial.path)) {
    if (existsSync(entity.lore.path)) {
      unlinkSync(entity.lore.path);
      console.log(`Deleted lore file ${entity.lore.path}.`);
    }
  }
}

for (const mapId of sampleMapIds) {
  const dir = `data/maps/${mapId}`;
  rmSync(dir, { recursive: true, force: true });
  console.log(`Removed sample map folder ${dir}/.`);
}

// --- dangling-reference report -------------------------------------------

const remainingEntities = loadEntities();
const dangling: string[] = [];
for (const entity of remainingEntities.values()) {
  if (sampleIds.has(entity.id)) continue;
  for (const relation of entity.relations) {
    if (sampleIds.has(relation.target)) {
      dangling.push(
        `"${entity.id}" has a "${relation.type}" relation targeting deleted "${relation.target}"`,
      );
    }
  }
  for (const loc of entity.location) {
    if (sampleIds.has(loc)) dangling.push(`"${entity.id}"'s location references deleted "${loc}"`);
  }
}
for (const { path, body } of loadLoreFiles()) {
  for (const target of wikiLinkTargets(body)) {
    if (sampleIds.has(target)) dangling.push(`${path} has a wiki link to deleted "${target}"`);
  }
}

if (dangling.length > 0) {
  console.log('\nDangling references (not auto-fixed — review and edit by hand):');
  for (const line of dangling) console.log(`  ${line}`);
} else {
  console.log('\nNo other entity referenced the sample id(s).');
}

for (const mapId of listMapIds()) {
  const layersDir = `data/maps/${mapId}/layers`;
  if (!existsSync(layersDir)) continue;
  for (const layerId of readdirSync(layersDir)) {
    const layerDir = `${layersDir}/${layerId}`;
    if (readdirSync(layerDir).length === 0) {
      console.log(
        `Note: ${layerDir}/ is now empty — that's fine, it's just an unused layer waiting for content.`,
      );
    }
  }
}

console.log('\nRun `npm run validate` next.');
