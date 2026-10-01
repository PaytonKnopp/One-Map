import entityTypesJson from '../../data/registry/entity-types.json';
import worldJson from '../../data/world.json';
import {
  EntityTypesRegistrySchema,
  MapConfigSchema,
  SpatialFeatureCollectionSchema,
  ThemeSchema,
  WorldSchema,
  type EntityTypesRegistry,
  type MapConfig,
  type SpatialFeature,
  type Theme,
  type World,
} from '../core/schema/index.ts';

// Eagerly globbed at build time (Vite inlines matches into the bundle) —
// this is a static analysis requirement of import.meta.glob, so the
// patterns themselves must stay literal strings. Which map/theme to use is
// then picked at runtime from these already-resolved dictionaries.
const rawMapConfigs = import.meta.glob('/data/maps/*/map.json', {
  eager: true,
  import: 'default',
});
const rawThemes = import.meta.glob('/data/themes/*.json', { eager: true, import: 'default' });
// .geojson isn't an extension Vite parses as JSON automatically (only
// .json is), so these are imported as raw text and parsed by hand below.
const rawLayerFiles = import.meta.glob('/data/maps/*/layers/*/*.geojson', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export const world: World = WorldSchema.parse(worldJson);
export const entityTypes: EntityTypesRegistry = EntityTypesRegistrySchema.parse(entityTypesJson);

export interface LoadedMapData {
  map: MapConfig;
  theme: Theme;
  /** Features grouped by the layer folder they were loaded from, in the order declared in map.json. */
  featuresByLayer: Map<string, SpatialFeature[]>;
}

/** Loads and validates one map's config, theme, and every feature in its declared layers. */
export function loadMapData(mapId: string): LoadedMapData {
  const mapPath = `/data/maps/${mapId}/map.json`;
  const rawMap = rawMapConfigs[mapPath];
  if (!rawMap) {
    throw new Error(`No map.json found for map id "${mapId}" (expected at ${mapPath})`);
  }
  const map = MapConfigSchema.parse(rawMap);

  const themeId = map.theme ?? world.defaultTheme;
  const themePath = `/data/themes/${themeId}.json`;
  const rawTheme = rawThemes[themePath];
  if (!rawTheme) {
    throw new Error(`Theme "${themeId}" not found (expected at ${themePath})`);
  }
  const theme = ThemeSchema.parse(rawTheme);

  const featuresByLayer = new Map<string, SpatialFeature[]>();
  for (const layer of map.layers) featuresByLayer.set(layer.id, []);

  const layerPrefix = `/data/maps/${mapId}/layers/`;
  for (const [path, raw] of Object.entries(rawLayerFiles)) {
    if (!path.startsWith(layerPrefix)) continue;
    const layerId = path.slice(layerPrefix.length).split('/')[0];
    const bucket = layerId ? featuresByLayer.get(layerId) : undefined;
    if (!bucket) continue; // undeclared layer folder — scripts/validate.ts flags this; the viewer just ignores it
    const collection = SpatialFeatureCollectionSchema.parse(JSON.parse(raw));
    bucket.push(...collection.features);
  }

  return { map, theme, featuresByLayer };
}
