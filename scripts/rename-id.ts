#!/usr/bin/env node
/**
 * Renames an entity's id everywhere it's referenced (brief §10) — the only
 * sanctioned way to change an id once it's been used anywhere. Updates:
 * the feature/lore frontmatter id itself; every relation `target`; every
 * lore `location`; every map.json `parentEntity`; wiki links in every lore
 * body; and renames the lore file itself to match, if one exists.
 */
import { unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

import { dump as dumpYaml } from 'js-yaml';

import { ID_PATTERN } from '../src/core/ids.ts';
import { formatJson } from './lib/canonical-json.ts';
import { loadEntities } from './lib/entities.ts';
import { listLayerFoldersOnDisk, listMapIds, loadLayerFiles, readJson } from './lib/load-data.ts';
import { loadLoreFiles } from './lib/load-lore.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { help: { type: 'boolean', short: 'h' } },
});

if (values.help || positionals.length < 2) {
  console.log(`Usage: npm run rename-id -- <old-id> <new-id>

Renames an entity's id everywhere: its own feature/lore frontmatter,
every relation target, every lore "location", every map.json
parentEntity, and every [[wiki link]] in lore bodies. Renames the lore
file to match, if one exists. The id must still be unique and
kebab-case afterward.
`);
  process.exit(values.help ? 0 : 1);
}

const [oldId, newId] = positionals as [string, string];

if (!ID_PATTERN.test(newId)) {
  console.error(`"${newId}" isn't kebab-case (lowercase letters/digits, single hyphens).`);
  process.exit(1);
}

const entities = loadEntities();
if (!entities.has(oldId)) {
  console.error(`No entity with id "${oldId}".`);
  process.exit(1);
}
if (entities.has(newId)) {
  console.error(`"${newId}" is already in use.`);
  process.exit(1);
}

const changedFiles: string[] = [];
const WIKI_LINK_ID = (id: string) =>
  new RegExp(`\\[\\[\\s*${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\|[^\\]]*)?\\]\\]`, 'g');

function renameWikiLinks(body: string): string {
  return body.replace(
    WIKI_LINK_ID(oldId),
    (_match, displaySuffix: string | undefined) => `[[${newId}${displaySuffix ?? ''}]]`,
  );
}

// --- spatial features (every map's every layer file) ----------------------

for (const mapId of listMapIds()) {
  const mapPath = `data/maps/${mapId}/map.json`;
  const mapConfig = readJson(mapPath) as { parentEntity?: string; layers?: { id: string }[] };
  if (mapConfig.parentEntity === oldId) {
    mapConfig.parentEntity = newId;
    writeFileSync(mapPath, formatJson(mapConfig), 'utf8');
    changedFiles.push(mapPath);
  }

  for (const layerId of listLayerFoldersOnDisk(mapId)) {
    for (const { path, raw } of loadLayerFiles(mapId, layerId)) {
      const collection = raw as { features: { properties: Record<string, unknown> }[] };
      let changed = false;

      for (const feature of collection.features) {
        const props = feature.properties;
        if (props.id === oldId) {
          props.id = newId;
          changed = true;
        }
        if (props.map === oldId) {
          // `map` holds a MAP id, a different namespace from entity ids —
          // left alone on purpose (see module comment).
        }
        for (const relation of (props.relations as { target: string }[] | undefined) ?? []) {
          if (relation.target === oldId) {
            relation.target = newId;
            changed = true;
          }
        }
      }

      if (changed) {
        writeFileSync(path, formatJson(collection), 'utf8');
        changedFiles.push(path);
      }
    }
  }
}

// --- lore files --------------------------------------------------------

for (const { path, data, body } of loadLoreFiles()) {
  const frontmatter = data as Record<string, unknown> & {
    id: string;
    type: string;
    relations?: { target: string }[];
    location?: string | string[];
  };
  let changed = false;
  let newPath = path;

  if (frontmatter.id === oldId) {
    frontmatter.id = newId;
    newPath = join(dirname(path), `${newId}.md`).split('\\').join('/');
    changed = true;
  }
  for (const relation of frontmatter.relations ?? []) {
    if (relation.target === oldId) {
      relation.target = newId;
      changed = true;
    }
  }
  if (frontmatter.location === oldId) {
    frontmatter.location = newId;
    changed = true;
  } else if (Array.isArray(frontmatter.location) && frontmatter.location.includes(oldId)) {
    frontmatter.location = frontmatter.location.map((loc) => (loc === oldId ? newId : loc));
    changed = true;
  }

  const newBody = renameWikiLinks(body);
  if (newBody !== body) changed = true;

  if (changed) {
    writeFileSync(newPath, `---\n${dumpYaml(frontmatter)}---\n\n${newBody}\n`, 'utf8');
    if (newPath !== path) {
      unlinkSync(path);
      changedFiles.push(`${path} -> ${newPath}`);
    } else {
      changedFiles.push(path);
    }
  }
}

console.log(`Renamed "${oldId}" -> "${newId}".`);
if (changedFiles.length > 0) {
  console.log('\nFiles changed:');
  for (const file of changedFiles) console.log(`  ${file}`);
} else {
  console.log('(nothing else referenced it)');
}
console.log('\nRun `npm run format:data && npm run validate` next.');
