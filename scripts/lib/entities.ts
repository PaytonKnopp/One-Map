import {
  MapConfigSchema,
  RelationTypesRegistrySchema,
  SpatialFeatureCollectionSchema,
  WorldSchema,
  type DateKey,
  type ImageRef,
  type Relation,
  type SpatialFeature,
  type World,
} from '../../src/core/schema/index.ts';
import { listMapIds, loadLayerFiles, readJson } from './load-data.ts';
import { loadLoreFiles } from './load-lore.ts';

// Plain `import x from './y.json'` needs a `with { type: 'json' }`
// attribute under Node's native ESM loader (unlike Vite, which handles it
// transparently) — read + parse by hand instead, consistent with every
// other script.
const worldJson = readJson('data/world.json');
const relationTypesJson = readJson('data/registry/relation-types.json');

/**
 * Node-side (fs-based) equivalent of src/content/entities.ts — the same
 * merged Entity shape, built from the same files via the same schemas, but
 * loaded through scripts/lib/load-data.ts + load-lore.ts instead of Vite's
 * import.meta.glob (see docs/DECISIONS.md on why these two loaders are
 * necessarily separate). Used by every read/write helper script.
 */

export const world: World = WorldSchema.parse(worldJson);
const relationTypes = RelationTypesRegistrySchema.parse(relationTypesJson);

export interface Backlink {
  sourceId: string;
  type: string;
  note?: string | undefined;
}

export interface Entity {
  id: string;
  type: string;
  subtype?: string | undefined;
  name: string;
  aliases: string[];
  summary?: string | undefined;
  tags: string[];
  status: 'canon' | 'draft' | 'retired';
  from?: DateKey | undefined;
  to?: DateKey | undefined;
  date?: DateKey | undefined;
  relations: Relation[];
  backlinks: Backlink[];
  images: ImageRef[];
  mapLink?: string | undefined;
  location: string[];
  lore?: { body: string; path: string } | undefined;
  spatial?: { feature: SpatialFeature; mapId: string; layerId: string; path: string } | undefined;
}

export interface SpatialFeatureLocation {
  mapId: string;
  layerId: string;
  path: string;
  feature: SpatialFeature;
}

/** Every spatial feature across every map, with exactly which file it lives in — mutation scripts (add/move/delete/rename-id) need the file, read-only scripts (find/show/where) just need the feature. */
export function listAllSpatialFeatures(): SpatialFeatureLocation[] {
  const results: SpatialFeatureLocation[] = [];
  for (const mapId of listMapIds()) {
    const mapJsonPath = `data/maps/${mapId}/map.json`;
    const mapConfig = MapConfigSchema.safeParse(readJson(mapJsonPath));
    if (!mapConfig.success) continue; // scripts/validate.ts is the source of truth for reporting this
    for (const layer of mapConfig.data.layers) {
      for (const { path, raw } of loadLayerFiles(mapId, layer.id)) {
        const collection = SpatialFeatureCollectionSchema.safeParse(raw);
        if (!collection.success) continue;
        for (const feature of collection.data.features) {
          results.push({ mapId, layerId: layer.id, path, feature });
        }
      }
    }
  }
  return results;
}

function buildEntities(): Map<string, Entity> {
  const entities = new Map<string, Entity>();

  for (const { mapId, layerId, path, feature } of listAllSpatialFeatures()) {
    const p = feature.properties;
    entities.set(p.id, {
      id: p.id,
      type: p.type,
      subtype: p.subtype,
      name: p.name ?? p.text ?? p.id,
      aliases: p.aliases ?? [],
      summary: p.summary,
      tags: p.tags ?? [],
      status: p.status,
      from: p.from,
      to: p.to,
      relations: p.relations ?? [],
      backlinks: [],
      images: p.images ?? [],
      mapLink: p.map,
      location: [],
      spatial: { feature, mapId, layerId, path },
    });
  }

  for (const { data, body, path } of loadLoreFiles()) {
    const frontmatter = data as {
      id: string;
      type: string;
      name?: string;
      aliases?: string[];
      summary?: string;
      tags?: string[];
      from?: DateKey;
      to?: DateKey;
      date?: DateKey;
      relations?: Relation[];
      status?: 'canon' | 'draft' | 'retired';
      location?: string | string[];
      images?: ImageRef[];
    };
    const existing = entities.get(frontmatter.id);
    const location =
      frontmatter.location === undefined
        ? []
        : Array.isArray(frontmatter.location)
          ? frontmatter.location
          : [frontmatter.location];

    if (existing) {
      existing.lore = { body, path };
      continue;
    }

    entities.set(frontmatter.id, {
      id: frontmatter.id,
      type: frontmatter.type,
      name: frontmatter.name ?? frontmatter.id,
      aliases: frontmatter.aliases ?? [],
      summary: frontmatter.summary,
      tags: frontmatter.tags ?? [],
      status: frontmatter.status ?? 'canon',
      from: frontmatter.from,
      to: frontmatter.to,
      date: frontmatter.date,
      relations: frontmatter.relations ?? [],
      backlinks: [],
      images: frontmatter.images ?? [],
      location,
      lore: { body, path },
    });
  }

  for (const entity of entities.values()) {
    for (const relation of entity.relations) {
      const target = entities.get(relation.target);
      if (!target) continue;
      const reciprocalType = relationTypes.relations[relation.type]?.reciprocal ?? relation.type;
      target.backlinks.push({ sourceId: entity.id, type: reciprocalType, note: relation.note });
    }
  }

  return entities;
}

/** Every entity (spatial and non-spatial), keyed by id. Rebuilt fresh each call — scripts are one-shot processes, not a long-lived server, so there's no staleness to worry about. */
export function loadEntities(): Map<string, Entity> {
  return buildEntities();
}
