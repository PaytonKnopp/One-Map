import { parseFrontmatter } from '../core/frontmatter.ts';
import { LoreFrontmatterSchema, type LoreFrontmatter } from '../core/schema/lore.ts';

// `/lore/<type>/<id>.md` — two path segments under lore/, which naturally
// excludes the root-level lore/_world-bible.md (not an entity).
const rawLoreFiles = import.meta.glob('/lore/*/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export interface LoreEntry {
  frontmatter: LoreFrontmatter;
  /** The Markdown body, frontmatter stripped. */
  body: string;
  /** Repo-relative path, for error messages and "view source" links. */
  path: string;
}

function loadLoreEntries(): Map<string, LoreEntry> {
  const entries = new Map<string, LoreEntry>();

  for (const [path, raw] of Object.entries(rawLoreFiles)) {
    const { data, content } = parseFrontmatter(raw as string);
    const frontmatter = LoreFrontmatterSchema.parse(data);

    if (entries.has(frontmatter.id)) {
      throw new Error(`duplicate lore entity id "${frontmatter.id}" (also at ${path})`);
    }
    entries.set(frontmatter.id, { frontmatter, body: content, path });
  }

  return entries;
}

/** Every `lore/<type>/<id>.md` entry, keyed by id. Parsed once per page load. */
export const loreEntriesById: Map<string, LoreEntry> = loadLoreEntries();
