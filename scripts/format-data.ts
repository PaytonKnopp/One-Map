#!/usr/bin/env node
/**
 * Rewrites every data/**\/*.json and data/**\/*.geojson file into canonical
 * form (see scripts/lib/canonical-json.ts): 2-space indent, alphabetically
 * sorted keys, coordinates rounded to 6 decimals, trailing newline. Running
 * it twice in a row is a no-op — that's what keeps Git diffs limited to
 * real content changes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { formatJson } from './lib/canonical-json.ts';
import { listDataJsonFiles } from './lib/data-files.ts';

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    check: { type: 'boolean' }, // report files that would change, without writing; exit 1 if any
  },
});

if (values.help) {
  console.log(`Usage: npm run format:data [-- --check]

Rewrites all data/**/*.json and data/**/*.geojson files into canonical
form (2-space indent, alphabetically sorted keys, coordinates rounded to
6 decimals, trailing newline).

  --check   Report files that are not canonically formatted, without
            writing to them. Exits 1 if any file would change.
  --help    Show this message.
`);
  process.exit(0);
}

const files = listDataJsonFiles();
let changedCount = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(original);
  } catch (error) {
    console.error(`✗ ${file}: invalid JSON (${(error as Error).message})`);
    process.exitCode = 1;
    continue;
  }

  const formatted = formatJson(parsed);
  if (formatted !== original) {
    changedCount++;
    if (values.check) {
      console.log(`would reformat: ${file}`);
    } else {
      writeFileSync(file, formatted, 'utf8');
      console.log(`reformatted: ${file}`);
    }
  }
}

if (values.check) {
  if (changedCount > 0) {
    console.error(
      `\n${changedCount} file(s) are not canonically formatted. Run \`npm run format:data\`.`,
    );
    process.exitCode = 1;
  } else {
    console.log(`All ${files.length} data file(s) are canonically formatted.`);
  }
} else {
  console.log(
    changedCount > 0
      ? `\nReformatted ${changedCount} of ${files.length} data file(s).`
      : `All ${files.length} data file(s) were already canonically formatted.`,
  );
}
