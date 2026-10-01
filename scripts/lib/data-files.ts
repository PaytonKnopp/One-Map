import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const JSON_LIKE_EXTENSIONS = new Set(['.json', '.geojson']);

/** Recursively lists every `.json`/`.geojson` file under `dir` (default: `data/`). */
export function listDataJsonFiles(dir = 'data'): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      const dotIndex = entry.lastIndexOf('.');
      const ext = dotIndex === -1 ? '' : entry.slice(dotIndex);
      if (JSON_LIKE_EXTENSIONS.has(ext)) {
        results.push(full.split('\\').join('/'));
      }
    }
  }

  walk(dir);
  return results.sort();
}
