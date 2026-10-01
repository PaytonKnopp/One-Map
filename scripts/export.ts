#!/usr/bin/env node
/** A timestamped backup of data/, lore/, and original assets/ into the gitignored backups/ folder (brief §10) — a single JSON bundle plus a .zip. */
import { ZipArchive, type ArchiverError } from 'archiver';
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { help: { type: 'boolean', short: 'h' } } });

if (values.help) {
  console.log(`Usage: npm run export

Writes backups/<timestamp>.json (every data/, lore/, and assets/ file's
content, plus data/world.json's name/schemaVersion) and
backups/<timestamp>.zip (the same three directories, as a real zip) —
both gitignored. Not a substitute for git history; just a quick
single-file/archive copy to keep elsewhere.
`);
  process.exit(0);
}

const SOURCE_DIRS = ['data', 'lore', 'assets'];
const EXCLUDED_DIR_NAMES = new Set(['vendor']); // assets/vendor/ is a regenerated build artifact, not content

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
    const full = join(dir, entry.name).split('\\').join('/');
    if (entry.isDirectory()) results.push(...walk(full));
    else results.push(full);
  }
  return results;
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('backups', { recursive: true });

// --- JSON bundle -----------------------------------------------------------

const files: Record<string, string> = {};
let totalBytes = 0;
for (const dir of SOURCE_DIRS) {
  try {
    statSync(dir);
  } catch {
    continue;
  }
  for (const file of walk(dir)) {
    const content = readFileSync(file, 'utf8');
    files[file] = content;
    totalBytes += content.length;
  }
}

const bundlePath = `backups/${timestamp}.json`;
writeFileSync(
  bundlePath,
  JSON.stringify({ exportedAt: timestamp, fileCount: Object.keys(files).length, files }, null, 2),
  'utf8',
);
console.log(
  `Wrote ${bundlePath} (${Object.keys(files).length} files, ${(totalBytes / 1024).toFixed(0)} KB).`,
);

// --- zip ---------------------------------------------------------------

const zipPath = `backups/${timestamp}.zip`;
const output = createWriteStream(zipPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

archive.on('error', (error: ArchiverError) => {
  throw error;
});
archive.pipe(output);
for (const dir of SOURCE_DIRS) {
  try {
    statSync(dir);
  } catch {
    continue;
  }
  archive.glob(`${dir}/**/*`, { ignore: ['**/vendor/**'] });
}

output.on('close', () => {
  console.log(`Wrote ${zipPath} (${(archive.pointer() / 1024).toFixed(0)} KB).`);
});

await archive.finalize();
