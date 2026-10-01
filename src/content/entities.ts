import relationTypesJson from '../../data/registry/relation-types.json';
import { entityTypes, loadAllSpatialFeatures } from '../map/data.ts';
import {
  RelationTypesRegistrySchema,
  type DateKey,
  type ImageRef,
  type Relation,
  type SpatialFeature,
} from '../core/schema/index.ts';
import { loreEntriesById } from './lore.ts';

const relationTypes = RelationTypesRegistrySchema.parse(relationTypesJson);

/** A relation pointing the other way, computed from the registry's reciprocal label — never hand-maintained (brief §6). */
export interface Backlink {
  sourceId: string;
  /** The reciprocal relation type, from the source entity's point of view reversed — e.g. source has `capital-of`, this backlink reads as `capital`. */
  type: string;
  note?: string | undefined;
}

/** The unified view of one entity, merging its GeoJSON feature (if spatial) and its lore file (if one exists) — the shape every UI component reads, so they don't need to know which half of the data model a field came from. */
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
  /** Where a non-spatial entity should be shown on the map, if anywhere. */
  location: string[];
  lore?: { body: string; path: string } | undefined;
  spatial?: { feature: SpatialFeature; mapId: string; layerId: string } | undefined;
}

function buildEntities(): Map<string, Entity> {
  const entities = new Map<string, Entity>();

  for (const { mapId, layerId, feature } of loadAllSpatialFeatures()) {
    const p = feature.properties;
    if (entities.has(p.id)) {
      throw new Error(`duplicate entity id "${p.id}" — found in more than one map/layer`);
    }
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
      spatial: { feature, mapId, layerId },
    });
  }

  for (const { frontmatter, body, path } of loreEntriesById.values()) {
    const existing = entities.get(frontmatter.id);
    const location =
      frontmatter.location === undefined
        ? []
        : Array.isArray(frontmatter.location)
          ? frontmatter.location
          : [frontmatter.location];

    if (existing) {
      // Spatial entity's lore body — the feature is the source of truth for
      // structured fields (field-ownership rule, brief §6); only attach prose.
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
      status: frontmatter.status,
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

  // Backlinks: the reverse of every relation, labeled with its registered
  // reciprocal — computed here, once, rather than hand-maintained on both ends.
  for (const entity of entities.values()) {
    for (const relation of entity.relations) {
      const target = entities.get(relation.target);
      if (!target) continue; // dangling reference — scripts/validate.ts is the source of truth for catching this
      const reciprocalType = relationTypes.relations[relation.type]?.reciprocal ?? relation.type;
      target.backlinks.push({ sourceId: entity.id, type: reciprocalType, note: relation.note });
    }
  }

  return entities;
}

/** Every entity (spatial and non-spatial) in the whole world, keyed by id. Built once per page load. */
export const entitiesById: Map<string, Entity> = buildEntities();

export function getEntity(id: string): Entity | undefined {
  return entitiesById.get(id);
}

export function listEntities(): Entity[] {
  return Array.from(entitiesById.values());
}

/** Registered non-spatial type ids, for Browse-view filtering (brief §8). */
export function nonSpatialTypeIds(): string[] {
  return Object.keys(entityTypes.nonSpatial);
}

/** Registered spatial type ids, for Browse-view filtering. */
export function spatialTypeIds(): string[] {
  return Object.keys(entityTypes.spatial);
}
