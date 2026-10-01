import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseFrontmatter } from '../../src/core/frontmatter.ts';

export interface LoreFile {
  path: string;
  data: unknown; // frontmatter, not yet schema-validated
  body: string;
}

/** Every `lore/<type>/<id>.md` file (excludes the root-level lore/_world-bible.md). */
export function loadLoreFiles(): LoreFile[] {
  const loreDir = 'lore';
  if (!existsSync(loreDir)) return [];

  const files: LoreFile[] = [];
  for (const typeDir of readdirSync(loreDir, { withFileTypes: true })) {
    if (!typeDir.isDirectory()) continue;
    const dir = join(loreDir, typeDir.name);
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const path = join(dir, file).split('\\').join('/');
      const { data, content } = parseFrontmatter(readFileSync(path, 'utf8'));
      files.push({ path, data, body: content });
    }
  }
  return files;
}

const WIKI_LINK_PATTERN = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;

/** Every entity id referenced by a `[[id]]`/`[[id|text]]` wiki link in `body`. */
export function wikiLinkTargets(body: string): string[] {
  return Array.from(body.matchAll(WIKI_LINK_PATTERN), (match) => match[1]!.trim());
}
