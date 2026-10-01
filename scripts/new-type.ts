#!/usr/bin/env node
/** Registers a new spatial subtype, non-spatial entity type, or relation type (brief §10) — a data edit, never a code change. */
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { formatJson } from './lib/canonical-json.ts';
import { readJson } from './lib/load-data.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { help: { type: 'boolean', short: 'h' } },
});

const kind = positionals[0];

if (values.help || !kind) {
  console.log(`Usage: npm run new-type -- subtype <place|region|route|label> <newSubtype>
       npm run new-type -- non-spatial <newType>
       npm run new-type -- relation <type> <reciprocal>

"subtype" adds a subtype under one of the 4 fixed spatial kinds.
"non-spatial" registers a brand-new entity type (person/faction/...).
"relation" registers a relation type and its reciprocal (both
directions — pass the same value twice for a symmetric relation like
"allied-with").
`);
  process.exit(values.help ? 0 : 1);
}

const ENTITY_TYPES_PATH = 'data/registry/entity-types.json';
const RELATION_TYPES_PATH = 'data/registry/relation-types.json';
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function checkId(id: string | undefined, label: string): string {
  if (!id || !ID_PATTERN.test(id)) {
    console.error(`${label} must be kebab-case; got "${id}".`);
    process.exit(1);
  }
  return id;
}

if (kind === 'subtype') {
  const spatialType = positionals[1];
  const subtype = checkId(positionals[2], 'subtype');
  const registry = readJson(ENTITY_TYPES_PATH) as {
    spatial: Record<string, { subtypes: string[] }>;
  };
  const def = registry.spatial[spatialType ?? ''];
  if (!def) {
    console.error(
      `"${spatialType}" isn't a spatial kind — must be one of: ${Object.keys(registry.spatial).join(', ')}`,
    );
    process.exit(1);
  }
  if (def.subtypes.includes(subtype)) {
    console.error(`"${subtype}" is already a subtype of "${spatialType}".`);
    process.exit(1);
  }
  def.subtypes.push(subtype);
  writeFileSync(ENTITY_TYPES_PATH, formatJson(registry), 'utf8');
  console.log(`Added subtype "${subtype}" under "${spatialType}".`);
} else if (kind === 'non-spatial') {
  const type = checkId(positionals[1], 'type');
  const registry = readJson(ENTITY_TYPES_PATH) as {
    spatial: Record<string, unknown>;
    nonSpatial: Record<string, unknown>;
  };
  if (registry.spatial[type] || registry.nonSpatial[type]) {
    console.error(`"${type}" is already registered.`);
    process.exit(1);
  }
  registry.nonSpatial[type] = {};
  writeFileSync(ENTITY_TYPES_PATH, formatJson(registry), 'utf8');
  console.log(`Registered non-spatial type "${type}". Lore files go under lore/${type}/.`);
} else if (kind === 'relation') {
  const type = checkId(positionals[1], 'type');
  const reciprocal = checkId(positionals[2], 'reciprocal');
  const registry = readJson(RELATION_TYPES_PATH) as {
    relations: Record<string, { reciprocal: string }>;
  };
  if (registry.relations[type]) {
    console.error(
      `"${type}" is already registered (reciprocal: "${registry.relations[type].reciprocal}").`,
    );
    process.exit(1);
  }
  registry.relations[type] = { reciprocal };
  if (reciprocal !== type) {
    if (registry.relations[reciprocal] && registry.relations[reciprocal].reciprocal !== type) {
      console.error(
        `"${reciprocal}" already exists with a different reciprocal ("${registry.relations[reciprocal].reciprocal}").`,
      );
      process.exit(1);
    }
    registry.relations[reciprocal] = { reciprocal: type };
  }
  writeFileSync(RELATION_TYPES_PATH, formatJson(registry), 'utf8');
  console.log(`Registered relation "${type}" <-> "${reciprocal}".`);
} else {
  console.error(`Unknown kind "${kind}" — expected subtype, non-spatial, or relation.`);
  process.exit(1);
}

console.log('Run `npm run format:data && npm run validate` next.');
