import MiniSearch from 'minisearch';

import { listEntities, type Entity } from './entities.ts';

interface SearchDoc {
  id: string;
  name: string;
  aliases: string;
  tags: string;
  summary: string;
  lore: string;
}

function toSearchDoc(entity: Entity): SearchDoc {
  return {
    id: entity.id,
    name: entity.name,
    aliases: entity.aliases.join(' '),
    tags: entity.tags.join(' '),
    summary: entity.summary ?? '',
    lore: entity.lore?.body ?? '',
  };
}

function buildIndex(): MiniSearch<SearchDoc> {
  const miniSearch = new MiniSearch<SearchDoc>({
    idField: 'id',
    fields: ['name', 'aliases', 'tags', 'summary', 'lore'],
    storeFields: ['name'],
    searchOptions: {
      boost: { name: 3, aliases: 2, tags: 2, summary: 1, lore: 0.5 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
  miniSearch.addAll(listEntities().map(toSearchDoc));
  return miniSearch;
}

const searchIndex = buildIndex();

export interface SearchResult {
  id: string;
  name: string;
  score: number;
}

/** Searches entity names, aliases, tags, summaries, and lore text (brief §8). */
export function searchEntities(query: string): SearchResult[] {
  if (!query.trim()) return [];
  return searchIndex.search(query).map((result) => ({
    id: String(result.id),
    name: String(result.name),
    score: result.score,
  }));
}
