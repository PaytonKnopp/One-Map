#!/usr/bin/env node
/**
 * Regenerates assets/icons/sprite.svg (a <symbol>-per-icon sprite, for DOM
 * UI use via `<use href="#id">`) from the individual assets/icons/*.svg
 * source files. Map markers (src/map/icons.ts) read the individual source
 * files directly, not the sprite, since they need to rasterize each icon
 * onto the map canvas in a theme-resolved color.
 *
 * Drop a new permissively-licensed SVG into assets/icons/ (named
 * <icon-id>.svg) and re-run this to make it available — no code change.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import svgstore from 'svgstore';

const ICONS_DIR = 'assets/icons';
const SPRITE_FILE = `${ICONS_DIR}/sprite.svg`;

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    list: { type: 'boolean' }, // print icon ids only, don't write the sprite
  },
});

if (values.help) {
  console.log(`Usage: npm run icons [-- --list]

Regenerates assets/icons/sprite.svg from assets/icons/*.svg.

  --list   Print the available icon ids and exit, without writing anything.
  --help   Show this message.
`);
  process.exit(0);
}

function listIconIds(): string[] {
  return readdirSync(ICONS_DIR)
    .filter((file) => file.endsWith('.svg') && file !== 'sprite.svg')
    .map((file) => file.slice(0, -'.svg'.length))
    .sort();
}

const iconIds = listIconIds();

if (values.list) {
  for (const id of iconIds) console.log(id);
  process.exit(0);
}

const sprite = svgstore();
for (const id of iconIds) {
  const svg = readFileSync(`${ICONS_DIR}/${id}.svg`, 'utf8');
  sprite.add(id, svg);
}

writeFileSync(SPRITE_FILE, `${sprite.toString()}\n`, 'utf8');
console.log(`Wrote ${SPRITE_FILE} (${iconIds.length} icon(s): ${iconIds.join(', ')})`);
