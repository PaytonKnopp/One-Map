#!/usr/bin/env node
/** Adds a new layer to an existing map (brief §10) — no code change needed. */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { formatJson } from './lib/canonical-json.ts';
import { readJson } from './lib/load-data.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    name: { type: 'string' },
    types: { type: 'string' }, // comma-separated
    'z-index': { type: 'string' },
    hidden: { type: 'boolean' },
  },
});

const [mapId, layerId] = positionals as [string | undefined, string | undefined];
if (values.help || !mapId || !layerId) {
  console.log(`Usage: npm run new-layer -- <mapId> <layerId> [options]

  --name <name>       (default: the layer id)
  --types <a,b>        Which spatial entity types belong here (optional; informational + checked if set).
  --z-index <n>        Draw order (default: 1 more than the highest existing).
  --hidden             Not visible by default.
`);
  process.exit(values.help ? 0 : 1);
}

const mapPath = `data/maps/${mapId}/map.json`;
if (!existsSync(mapPath)) {
  console.error(`No map "${mapId}" (expected ${mapPath}).`);
  process.exit(1);
}

const mapConfig = readJson(mapPath) as { layers: { id: string; zIndex: number }[] };
if (mapConfig.layers.some((l) => l.id === layerId)) {
  console.error(`Layer "${layerId}" already exists on map "${mapId}".`);
  process.exit(1);
}

const zIndex = values['z-index']
  ? Number(values['z-index'])
  : Math.max(-1, ...mapConfig.layers.map((l) => l.zIndex)) + 1;

const layer: Record<string, unknown> = {
  id: layerId,
  name: values.name ?? layerId,
  defaultVisible: !values.hidden,
  zIndex,
};
if (values.types) layer.types = values.types.split(',').map((t) => t.trim());

mapConfig.layers.push(layer as { id: string; zIndex: number });
writeFileSync(mapPath, formatJson(mapConfig), 'utf8');
mkdirSync(`data/maps/${mapId}/layers/${layerId}`, { recursive: true });

console.log(`Added layer "${layerId}" to ${mapPath} and created its folder.`);
console.log('Run `npm run format:data && npm run validate` next.');
