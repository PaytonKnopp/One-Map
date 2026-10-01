import { z } from 'zod';

import { ID_PATTERN } from '../ids.ts';
import { CoordinateSchema } from './geojson.ts';

const id = z.string().regex(ID_PATTERN, 'ids must be kebab-case');

export const LayerDeclSchema = z.object({
  id,
  name: z.string().min(1),
  /** Informational: which spatial entity types this layer is meant to hold. Not enforced by schema — scripts/validate.ts cross-checks actual features against this if set. */
  types: z.array(z.enum(['place', 'region', 'route', 'label'])).optional(),
  defaultVisible: z.boolean().default(true),
  /** Draw order; higher paints on top. Must be unique within a map (checked by scripts/validate.ts). */
  zIndex: z.number().int(),
});

export const MapViewSchema = z.object({
  center: CoordinateSchema,
  zoom: z.number().min(0),
});

/**
 * A raster image/tile underlay (brief §9 — "support optional raster 'art
 * layers' ... for future painted art. Build only the hook, not any art.").
 * `bounds` are the image's four corners, matching MapLibre's `image`
 * source: top-left, top-right, bottom-right, bottom-left. No art exists
 * yet anywhere in this repo — this schema plus the rendering in
 * src/map/MapView.tsx is the hook brief §9 asks for, exercised by nothing
 * until a real image is added.
 */
export const ArtLayerSchema = z.object({
  id,
  name: z.string().min(1),
  /** Path under assets/, e.g. "images/my-map.webp" (served at `${BASE_URL}images/my-map.webp`). */
  src: z.string().min(1),
  bounds: z.tuple([CoordinateSchema, CoordinateSchema, CoordinateSchema, CoordinateSchema]),
  opacity: z.number().min(0).max(1).default(1),
  defaultVisible: z.boolean().default(true),
});

export const MapConfigSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id,
  name: z.string().min(1),
  /** Entity id this map is nested under (brief §4.4). Absent for the top-level world map. */
  parentEntity: id.optional(),
  /** Display name for this map's own distance unit — may differ from the world's (e.g. "m" for a city map). */
  unit: z.string().min(1),
  planeMetersPerUnit: z.number().positive(),
  /** Theme id override; falls back to data/world.json's defaultTheme when unset. */
  theme: id.optional(),
  defaultView: MapViewSchema,
  /** [[minLng, minLat], [maxLng, maxLat]] — locks maplibre's maxBounds and bounds the canvas this map's coordinates live on. */
  bounds: z.tuple([CoordinateSchema, CoordinateSchema]),
  minZoom: z.number().min(0).optional(),
  maxZoom: z.number().min(0).optional(),
  layers: z.array(LayerDeclSchema),
  artLayers: z.array(ArtLayerSchema).optional(),
});

export type LayerDecl = z.infer<typeof LayerDeclSchema>;
export type MapView = z.infer<typeof MapViewSchema>;
export type ArtLayer = z.infer<typeof ArtLayerSchema>;
export type MapConfig = z.infer<typeof MapConfigSchema>;
