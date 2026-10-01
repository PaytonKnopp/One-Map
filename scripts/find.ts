#!/usr/bin/env node
/** Searches entities by name/alias/tag; prints id, type, coords (if spatial), and summary (brief §10). */
import { parseArgs } from 'node:util';

import { loadEntities } from './lib/entities.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    type: { type: 'string' },
    tag: { type: 'string' },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`Usage: npm run find -- <text> [--type <type>] [--tag <tag>]

Searches entity names, aliases, and tags for <text> (case-insensitive
substring match). Prints id, type/subtype, coordinates (if spatial),
and summary for each match.

  --type <type>   Only entities of this type (e.g. "place").
  --tag <tag>     Only entities with this tag.
  --help          Show this message.
`);
  process.exit(values.help ? 0 : 1);
}

const query = positionals.join(' ').toLowerCase();
const entities = Array.from(loadEntities().values());

const matches = entities.filter((entity) => {
  if (values.type && entity.type !== values.type) return false;
  if (values.tag && !entity.tags.includes(values.tag)) return false;
  const haystack = [entity.name, ...entity.aliases, ...entity.tags].join(' ').toLowerCase();
  return haystack.includes(query);
});

if (matches.length === 0) {
  console.log(`No entities match "${query}".`);
  process.exit(0);
}

for (const entity of matches) {
  const coords =
    entity.spatial?.feature.geometry.type === 'Point'
      ? ` [${entity.spatial.feature.geometry.coordinates.join(', ')}]`
      : '';
  const kind = entity.subtype ? `${entity.type}/${entity.subtype}` : entity.type;
  console.log(`${entity.id}  (${kind})${coords}`);
  if (entity.summary) console.log(`  ${entity.summary}`);
}
console.log(`\n${matches.length} match(es).`);
