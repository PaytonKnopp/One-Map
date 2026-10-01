#!/usr/bin/env node
/**
 * Deletes one or more entities (brief §10/§2) — refuses more than 5
 * without --yes, and reports (doesn't silently fix) every dangling
 * reference the deletion creates, since a relation or wiki link might be
 * meaningful content worth a human looking at rather than quietly erasing.
 */
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { formatJson } from './lib/canonical-json.ts';
import { loadEntities } from './lib/entities.ts';
import { readJson } from './lib/load-data.ts';
import { loadLoreFiles, wikiLinkTargets } from './lib/load-lore.ts';

const MASS_DELETE_THRESHOLD = 5;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { help: { type: 'boolean', short: 'h' }, yes: { type: 'boolean' } },
});

if (values.help || positionals.length === 0) {
  console.log(`Usage: npm run delete -- <id> [<id> ...] [--yes]

Deletes the given entities: removes their feature from its .geojson
file (deleting the file if it's now empty) and/or their lore file.
Refuses more than ${MASS_DELETE_THRESHOLD} ids without --yes. Reports
every other entity whose relation or wiki link now points at a deleted
id — it does not edit those other files for you.

  --yes   Required to delete more than ${MASS_DELETE_THRESHOLD} at once.
`);
  process.exit(values.help ? 0 : 1);
}

const ids = positionals;
if (ids.length > MASS_DELETE_THRESHOLD && !values.yes) {
  console.error(
    `Deleting ${ids.length} entities (> ${MASS_DELETE_THRESHOLD}) needs --yes. Ids: ${ids.join(', ')}`,
  );
  process.exit(1);
}

const entities = loadEntities();
const idSet = new Set(ids);
const missing = ids.filter((id) => !entities.has(id));
if (missing.length > 0) {
  console.error(`Unknown id(s): ${missing.join(', ')}`);
  process.exit(1);
}

for (const id of ids) {
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

// --- dangling-reference report -------------------------------------------

const dangling: string[] = [];
for (const entity of entities.values()) {
  if (idSet.has(entity.id)) continue;
  for (const relation of entity.relations) {
    if (idSet.has(relation.target)) {
      dangling.push(
        `"${entity.id}" has a "${relation.type}" relation targeting deleted "${relation.target}"`,
      );
    }
  }
  for (const loc of entity.location) {
    if (idSet.has(loc)) dangling.push(`"${entity.id}"'s location references deleted "${loc}"`);
  }
}
for (const { path, body } of loadLoreFiles()) {
  for (const target of wikiLinkTargets(body)) {
    if (idSet.has(target)) dangling.push(`${path} has a wiki link to deleted "${target}"`);
  }
}

if (dangling.length > 0) {
  console.log('\nDangling references (not auto-fixed — review and edit by hand):');
  for (const line of dangling) console.log(`  ${line}`);
} else {
  console.log('\nNo other entity referenced the deleted id(s).');
}
console.log('\nRun `npm run validate` next.');
