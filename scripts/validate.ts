#!/usr/bin/env node
/**
 * Validates data/world.json, data/registry/*.json, data/themes/*.json,
 * and every map's map.json + layer GeoJSON files under data/maps/: schema
 * conformance, cross-reference consistency (relation reciprocals and targets, type/
 * subtype registration, theme/map references, icon references), GeoJSON
 * correctness (ring closure, in-bounds coordinates), date validity, and
 * canonical formatting. Exits non-zero with grouped, actionable messages
 * on failure.
 *
 * Still to grow here once lore exists (M3): field-ownership checks
 * (a field defined in both a feature and its lore frontmatter), wiki-link
 * and lore-file dangling-reference checks — see docs/DATA_MODEL.md and
 * brief Section 7.
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { compareDates, isValidDate } from '../src/core/calendar.ts';
import {
  EntityTypesRegistrySchema,
  LabelFeatureSchema,
  LoreFrontmatterSchema,
  MapConfigSchema,
  PlaceFeatureSchema,
  RegionFeatureSchema,
  RelationTypesRegistrySchema,
  RouteFeatureSchema,
  ThemeSchema,
  WorldSchema,
  type CalendarConfig,
  type SpatialFeature,
  type SpatialProperties,
} from '../src/core/schema/index.ts';
import { formatJson } from './lib/canonical-json.ts';
import { listDataJsonFiles } from './lib/data-files.ts';
import {
  assetExists,
  iconExists,
  listLayerFoldersOnDisk,
  listMapIds,
  listThemeIds,
  loadLayerFiles,
} from './lib/load-data.ts';
import { loadLoreFiles, wikiLinkTargets } from './lib/load-lore.ts';

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`Usage: npm run validate

Validates world.json, the registries, every theme/map/layer, and every
lore file against their schemas; checks cross-reference consistency
(relations, icons, theme/map references, field ownership, wiki links);
and checks canonical formatting. Prints warnings (e.g. a spatial entity
with no lore file) without failing. Exits 1 if anything else fails.
`);
  process.exit(0);
}

interface Problem {
  file: string;
  message: string;
}

const problems: Problem[] = [];
const warnings: Problem[] = [];

function fail(file: string, message: string): void {
  problems.push({ file, message });
}

function warn(file: string, message: string): void {
  warnings.push({ file, message });
}

function loadJson(file: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    fail(file, 'file not found');
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(file, `invalid JSON: ${(error as Error).message}`);
    return undefined;
  }
}

// --- world.json ---------------------------------------------------------

const worldPath = 'data/world.json';
const worldJson = loadJson(worldPath);
let calendar: CalendarConfig | undefined;
let defaultTheme: string | undefined;
let defaultMap: string | undefined;
if (worldJson !== undefined) {
  const result = WorldSchema.safeParse(worldJson);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(worldPath, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  } else {
    calendar = result.data.calendar;
    defaultTheme = result.data.defaultTheme;
    defaultMap = result.data.defaultMap;
  }
}

// --- registry/entity-types.json ------------------------------------------

const entityTypesPath = 'data/registry/entity-types.json';
const entityTypesJson = loadJson(entityTypesPath);
let spatialSubtypesByType: Record<string, string[]> | undefined;
let nonSpatialTypeKeys: Set<string> | undefined;
if (entityTypesJson !== undefined) {
  const result = EntityTypesRegistrySchema.safeParse(entityTypesJson);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(entityTypesPath, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  } else {
    spatialSubtypesByType = Object.fromEntries(
      Object.entries(result.data.spatial).map(([type, def]) => [type, def.subtypes]),
    );
    nonSpatialTypeKeys = new Set(Object.keys(result.data.nonSpatial));
    const spatialKeys = Object.keys(result.data.spatial);
    const nonSpatialKeys = Object.keys(result.data.nonSpatial);
    const collisions = spatialKeys.filter((key) => nonSpatialKeys.includes(key));
    for (const key of collisions) {
      fail(entityTypesPath, `type "${key}" is registered as both spatial and non-spatial`);
    }
    for (const [typeKey, def] of Object.entries(result.data.spatial)) {
      const seen = new Set<string>();
      for (const subtype of def.subtypes) {
        if (seen.has(subtype)) {
          fail(entityTypesPath, `type "${typeKey}" lists subtype "${subtype}" more than once`);
        }
        seen.add(subtype);
      }
    }
  }
}

// --- registry/relation-types.json ----------------------------------------

const relationTypesPath = 'data/registry/relation-types.json';
const relationTypesJson = loadJson(relationTypesPath);
let relationTypeKeys: Set<string> | undefined;
if (relationTypesJson !== undefined) {
  const result = RelationTypesRegistrySchema.safeParse(relationTypesJson);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(relationTypesPath, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  } else {
    relationTypeKeys = new Set(Object.keys(result.data.relations));
    for (const [key, def] of Object.entries(result.data.relations)) {
      const reciprocalDef = result.data.relations[def.reciprocal];
      if (!reciprocalDef) {
        fail(
          relationTypesPath,
          `relation "${key}" declares reciprocal "${def.reciprocal}", which is not registered`,
        );
        continue;
      }
      if (reciprocalDef.reciprocal !== key) {
        fail(
          relationTypesPath,
          `relation "${key}" -> reciprocal "${def.reciprocal}" -> reciprocal ` +
            `"${reciprocalDef.reciprocal}" is not symmetric (expected "${key}")`,
        );
      }
    }
  }
}

// --- data/themes/*.json ----------------------------------------------------

const themeIds = listThemeIds();
for (const themeId of themeIds) {
  const path = `data/themes/${themeId}.json`;
  const json = loadJson(path);
  if (json === undefined) continue;
  const result = ThemeSchema.safeParse(json);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(path, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    continue;
  }
  if (result.data.id !== themeId) {
    fail(path, `"id" ("${result.data.id}") must match the filename ("${themeId}")`);
  }
}

if (defaultTheme !== undefined && !themeIds.includes(defaultTheme)) {
  fail(worldPath, `defaultTheme "${defaultTheme}" has no data/themes/${defaultTheme}.json`);
}

// --- data/maps/*/ (map.json + layers/*/*.geojson) -------------------------

const mapIds = listMapIds();
if (defaultMap !== undefined && !mapIds.includes(defaultMap)) {
  fail(worldPath, `defaultMap "${defaultMap}" has no data/maps/${defaultMap}/ directory`);
}

// Entity IDs must be unique across the WHOLE repo (brief §2.3), so this is
// collected across every map, not reset per map.
const seenEntityIds = new Map<string, string>(); // id -> file it was first seen in
const allFeaturesById = new Map<string, SpatialFeature>();
const mapConfigsById = new Map<string, { parentEntity: string | undefined; path: string }>();

for (const mapId of mapIds) {
  const mapPath = `data/maps/${mapId}/map.json`;
  const mapJson = loadJson(mapPath);
  if (mapJson === undefined) continue;

  const mapResult = MapConfigSchema.safeParse(mapJson);
  if (!mapResult.success) {
    for (const issue of mapResult.error.issues) {
      fail(mapPath, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    continue;
  }
  const mapConfig = mapResult.data;

  if (mapConfig.id !== mapId) {
    fail(mapPath, `"id" ("${mapConfig.id}") must match the directory name ("${mapId}")`);
  }
  if (mapConfig.theme !== undefined && !themeIds.includes(mapConfig.theme)) {
    fail(mapPath, `theme "${mapConfig.theme}" has no data/themes/${mapConfig.theme}.json`);
  }
  mapConfigsById.set(mapConfig.id, { parentEntity: mapConfig.parentEntity, path: mapPath });

  for (const artLayer of mapConfig.artLayers ?? []) {
    if (!assetExists(artLayer.src)) {
      fail(mapPath, `art layer "${artLayer.id}": "${artLayer.src}" has no file under assets/`);
    }
  }

  const zIndexSeen = new Map<number, string>();
  const declaredLayerIds = new Set<string>();
  for (const layer of mapConfig.layers) {
    declaredLayerIds.add(layer.id);
    const existingLayer = zIndexSeen.get(layer.zIndex);
    if (existingLayer) {
      fail(
        mapPath,
        `layers "${existingLayer}" and "${layer.id}" both declare zIndex ${layer.zIndex}`,
      );
    }
    zIndexSeen.set(layer.zIndex, layer.id);
  }

  const foldersOnDisk = listLayerFoldersOnDisk(mapId);
  for (const folder of foldersOnDisk) {
    if (!declaredLayerIds.has(folder)) {
      fail(mapPath, `layers/${folder}/ exists on disk but isn't declared in "layers"`);
    }
  }

  const [swLng, swLat] = mapConfig.bounds[0];
  const [neLng, neLat] = mapConfig.bounds[1];

  for (const layer of mapConfig.layers) {
    for (const { path, raw } of loadLayerFiles(mapId, layer.id)) {
      const collectionShape = raw as { type?: string; features?: unknown[] };
      if (
        collectionShape.type !== 'FeatureCollection' ||
        !Array.isArray(collectionShape.features)
      ) {
        fail(path, 'expected a GeoJSON FeatureCollection');
        continue;
      }

      collectionShape.features.forEach((rawFeature, index) => {
        const featureLabel = `features[${index}]`;
        const typeGuess = (rawFeature as { properties?: { type?: unknown } }).properties?.type;
        const schemaForType =
          typeGuess === 'place'
            ? PlaceFeatureSchema
            : typeGuess === 'region'
              ? RegionFeatureSchema
              : typeGuess === 'route'
                ? RouteFeatureSchema
                : typeGuess === 'label'
                  ? LabelFeatureSchema
                  : undefined;

        if (!schemaForType) {
          fail(
            path,
            `${featureLabel}: unknown or missing properties.type ("${String(typeGuess)}")`,
          );
          return;
        }

        const result = schemaForType.safeParse(rawFeature);
        if (!result.success) {
          for (const issue of result.error.issues) {
            fail(path, `${featureLabel} ${issue.path.join('.') || '(root)'}: ${issue.message}`);
          }
          return;
        }

        const feature = result.data as SpatialFeature;
        const { id, type, subtype, icon, from, to, relations } = feature.properties;

        const firstSeenIn = seenEntityIds.get(id);
        if (firstSeenIn) {
          fail(path, `duplicate entity id "${id}" (also defined in ${firstSeenIn})`);
        } else {
          seenEntityIds.set(id, path);
          allFeaturesById.set(id, feature);
        }

        if (layer.types && !layer.types.includes(type)) {
          fail(
            path,
            `${featureLabel} ("${id}"): type "${type}" isn't in layer "${layer.id}"'s declared types`,
          );
        }

        if (spatialSubtypesByType) {
          const allowedSubtypes = spatialSubtypesByType[type];
          if (!allowedSubtypes) {
            fail(
              path,
              `${featureLabel} ("${id}"): type "${type}" isn't registered in entity-types.json`,
            );
          } else if (subtype !== undefined && !allowedSubtypes.includes(subtype)) {
            fail(
              path,
              `${featureLabel} ("${id}"): subtype "${subtype}" isn't registered under type "${type}"`,
            );
          }
        }

        if (icon !== undefined && !iconExists(icon)) {
          fail(path, `${featureLabel} ("${id}"): icon "${icon}" has no assets/icons/${icon}.svg`);
        }

        if (calendar) {
          if (from && !isValidDate(from, calendar)) {
            fail(
              path,
              `${featureLabel} ("${id}"): "from" date is invalid for the world's calendar`,
            );
          }
          if (to && !isValidDate(to, calendar)) {
            fail(path, `${featureLabel} ("${id}"): "to" date is invalid for the world's calendar`);
          }
          if (from && to && compareDates(from, to, calendar) > 0) {
            fail(path, `${featureLabel} ("${id}"): "from" date is after "to" date`);
          }
        }

        for (const relation of relations ?? []) {
          if (relationTypeKeys && !relationTypeKeys.has(relation.type)) {
            fail(
              path,
              `${featureLabel} ("${id}"): relation type "${relation.type}" isn't registered in relation-types.json`,
            );
          }
        }

        // Polygon/MultiPolygon rings must close (RFC 7946) and stay within the map's canvas.
        const geometry = feature.geometry;
        const rings: [number, number][][] =
          geometry.type === 'Polygon'
            ? geometry.coordinates
            : geometry.type === 'MultiPolygon'
              ? geometry.coordinates.flat()
              : [];
        for (const ring of rings) {
          const first = ring[0];
          const last = ring[ring.length - 1];
          if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
            fail(
              path,
              `${featureLabel} ("${id}"): polygon ring isn't closed (first point != last point)`,
            );
          }
        }

        const allCoords: [number, number][] =
          geometry.type === 'Point'
            ? [geometry.coordinates]
            : geometry.type === 'LineString'
              ? geometry.coordinates
              : rings.flat();
        for (const [lng, lat] of allCoords) {
          if (lng < swLng || lng > neLng || lat < swLat || lat > neLat) {
            fail(
              path,
              `${featureLabel} ("${id}"): coordinate [${lng}, ${lat}] is outside the map's bounds`,
            );
            break;
          }
        }
      });
    }
  }
}

// --- lore/<type>/<id>.md ----------------------------------------------

const SPATIAL_TYPES = new Set(['place', 'region', 'route', 'label']);
const FEATURE_OWNED_FIELDS = [
  'name',
  'aliases',
  'summary',
  'tags',
  'from',
  'to',
  'relations',
  'images',
] as const;

/** id -> { relations, path } for every entity, spatial or lore-only — the universe `relations[].target` and wiki links are checked against. */
const allEntitiesById = new Map<
  string,
  { relations: { type: string; target: string }[]; path: string }
>();
for (const [id, feature] of allFeaturesById) {
  allEntitiesById.set(id, {
    relations: feature.properties.relations ?? [],
    path: seenEntityIds.get(id) ?? id,
  });
}

const loreFilesByEntityId = new Map<string, string>(); // for the "missing lore file" warning below
const loreBodiesForWikiCheck: { id: string; path: string; body: string }[] = [];

for (const { path, data, body } of loadLoreFiles()) {
  const result = LoreFrontmatterSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(path, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    continue;
  }
  const fm = result.data;
  loreFilesByEntityId.set(fm.id, path);

  if (SPATIAL_TYPES.has(fm.type)) {
    const feature = allFeaturesById.get(fm.id);
    if (!feature) {
      fail(path, `lore file for "${fm.id}" (type "${fm.type}") has no matching spatial entity`);
      continue;
    }
    for (const field of FEATURE_OWNED_FIELDS) {
      const loreValue = fm[field as keyof typeof fm];
      const featureValue = feature.properties[field as keyof SpatialProperties];
      if (loreValue !== undefined && featureValue !== undefined) {
        fail(
          path,
          `"${field}" is defined on both the feature and this lore frontmatter — pick one (brief §6 field ownership)`,
        );
      }
    }
  } else {
    if (allFeaturesById.has(fm.id)) {
      fail(
        path,
        `lore id "${fm.id}" collides with a spatial entity but frontmatter type "${fm.type}" isn't spatial`,
      );
    } else if (allEntitiesById.has(fm.id)) {
      fail(path, `duplicate entity id "${fm.id}" (also at ${allEntitiesById.get(fm.id)!.path})`);
    }
    if (nonSpatialTypeKeys && !nonSpatialTypeKeys.has(fm.type)) {
      fail(path, `type "${fm.type}" isn't registered as non-spatial in entity-types.json`);
    }
    allEntitiesById.set(fm.id, { relations: fm.relations ?? [], path });
  }

  for (const relation of fm.relations ?? []) {
    if (relationTypeKeys && !relationTypeKeys.has(relation.type)) {
      fail(
        path,
        `"${fm.id}": relation type "${relation.type}" isn't registered in relation-types.json`,
      );
    }
  }
  if (fm.location) {
    for (const locationId of Array.isArray(fm.location) ? fm.location : [fm.location]) {
      if (!allFeaturesById.has(locationId)) {
        fail(path, `"${fm.id}": location "${locationId}" isn't a spatial entity`);
      }
    }
  }

  loreBodiesForWikiCheck.push({ id: fm.id, path, body });
}

// Wiki links, checked in their own pass against the complete entity set so
// forward references between lore files (loaded in directory order, not
// dependency order) don't produce false "doesn't resolve" warnings.
for (const { id, path, body } of loreBodiesForWikiCheck) {
  for (const targetId of wikiLinkTargets(body)) {
    if (targetId !== id && !allFeaturesById.has(targetId) && !loreFilesByEntityId.has(targetId)) {
      warn(path, `"${id}": wiki link to "${targetId}" doesn't resolve to any entity`);
    }
  }
}

// Relation targets, checked after every map AND every lore file are loaded
// so forward references (an earlier file pointing at a later one) work.
for (const [id, entity] of allEntitiesById) {
  for (const relation of entity.relations) {
    if (!allEntitiesById.has(relation.target)) {
      fail(
        entity.path,
        `"${id}" has a "${relation.type}" relation targeting unknown entity "${relation.target}"`,
      );
    }
  }
}

// Nested maps (brief §4.4): a map's parentEntity must be a real spatial
// entity, and that entity's own `map` field (if set) should point back at
// this map — otherwise the breadcrumb trail and the "Open map" link
// disagree about where this map lives.
for (const [mapId, { parentEntity, path }] of mapConfigsById) {
  if (parentEntity === undefined) continue;
  const entity = allFeaturesById.get(parentEntity);
  if (!entity) {
    fail(path, `parentEntity "${parentEntity}" is not a spatial entity`);
  } else if (entity.properties.map !== undefined && entity.properties.map !== mapId) {
    fail(
      path,
      `parentEntity "${parentEntity}" points back at map "${entity.properties.map}", not this map ("${mapId}")`,
    );
  }
}

for (const feature of allFeaturesById.values()) {
  if (!loreFilesByEntityId.has(feature.properties.id)) {
    warn(
      seenEntityIds.get(feature.properties.id) ?? feature.properties.id,
      `"${feature.properties.id}" has no lore file (optional)`,
    );
  }
}

// --- canonical formatting -------------------------------------------------

for (const file of listDataJsonFiles()) {
  const raw = readFileSync(file, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Already reported above for files we explicitly load; for any other
    // malformed data file, report it here too.
    fail(file, 'invalid JSON');
    continue;
  }
  if (formatJson(parsed) !== raw) {
    fail(file, 'not canonically formatted — run `npm run format:data`');
  }
}

// --- report ---------------------------------------------------------------

function printGrouped(items: Problem[]): void {
  const byFile = new Map<string, string[]>();
  for (const { file, message } of items) {
    const existing = byFile.get(file) ?? [];
    existing.push(message);
    byFile.set(file, existing);
  }
  for (const [file, messages] of byFile) {
    console.error(file);
    for (const message of messages) {
      console.error(`  - ${message}`);
    }
  }
}

if (warnings.length > 0) {
  console.error(`⚠ ${warnings.length} warning(s):\n`);
  printGrouped(warnings);
  console.error('');
}

if (problems.length > 0) {
  console.error(`✗ ${problems.length} problem(s) found:\n`);
  printGrouped(problems);
  process.exitCode = 1;
} else {
  console.log('✓ validation passed');
}
