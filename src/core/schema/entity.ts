import { z } from 'zod';

import { ID_PATTERN } from '../ids.ts';
import {
  LabelGeometrySchema,
  LineStringGeometrySchema,
  MultiPolygonGeometrySchema,
  PointGeometrySchema,
  PolygonGeometrySchema,
  RegionGeometrySchema,
} from './geojson.ts';

const id = z.string().regex(ID_PATTERN, 'ids must be kebab-case');
const tagSchema = z.string().regex(ID_PATTERN, 'tags must be kebab-case');

export const DateKeySchema = z.object({
  y: z.number().int(),
  m: z.number().int().min(1).optional(),
  d: z.number().int().min(1).optional(),
});
export type DateKey = z.infer<typeof DateKeySchema>;

export const EntityStatusSchema = z.enum(['canon', 'draft', 'retired']);
export type EntityStatus = z.infer<typeof EntityStatusSchema>;

export const RelationSchema = z.object({
  type: id,
  target: id,
  from: DateKeySchema.optional(),
  to: DateKeySchema.optional(),
  note: z.string().min(1).optional(),
});
export type Relation = z.infer<typeof RelationSchema>;

export const ImageRefSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().min(1).optional(),
});
export type ImageRef = z.infer<typeof ImageRefSchema>;

/** Spatial entity kinds (brief §6) — fixed by the data model, unlike subtypes. */
export const SPATIAL_ENTITY_TYPES = ['place', 'region', 'route', 'label'] as const;
export type SpatialEntityType = (typeof SPATIAL_ENTITY_TYPES)[number];

/**
 * Fields shared by every spatial entity (brief §6). `type`/`subtype` are
 * cross-checked against data/registry/entity-types.json by
 * scripts/validate.ts, not by this schema (this schema doesn't know the
 * registry's contents). Likewise geometry<->type correspondence is checked
 * in the validator, not encoded as a Zod discriminated union, to keep each
 * piece simple and the error messages direct.
 */
export const SpatialPropertiesSchema = z.object({
  id,
  type: z.enum(SPATIAL_ENTITY_TYPES),
  subtype: id.optional(),
  name: z.string().min(1).optional(),
  aliases: z.array(z.string().min(1)).optional(),
  summary: z.string().min(1).optional(),
  tags: z.array(tagSchema).optional(),
  rank: z.number().int().min(1).max(5).optional(),
  icon: id.optional(),
  from: DateKeySchema.optional(),
  to: DateKeySchema.optional(),
  relations: z.array(RelationSchema).optional(),
  status: EntityStatusSchema.default('canon'),
  /** Nested map id this entity opens (brief §4.4). */
  map: id.optional(),
  images: z.array(ImageRefSchema).optional(),
  /** Per-entity style override; shape mirrors a theme's TypeStyle (src/core/schema/theme.ts). */
  style: z.record(z.string(), z.unknown()).optional(),
  // `label`-only fields:
  text: z.string().min(1).optional(),
  rotation: z.number().optional(),
});

export type SpatialProperties = z.infer<typeof SpatialPropertiesSchema>;

const featureTypeMatches =
  (expected: SpatialEntityType) => (f: { properties: SpatialProperties }) =>
    f.properties.type === expected;

export const PlaceFeatureSchema = z
  .object({
    type: z.literal('Feature'),
    geometry: PointGeometrySchema,
    properties: SpatialPropertiesSchema,
  })
  .refine(featureTypeMatches('place'), { message: 'properties.type must be "place"' });

export const RegionFeatureSchema = z
  .object({
    type: z.literal('Feature'),
    geometry: RegionGeometrySchema,
    properties: SpatialPropertiesSchema,
  })
  .refine(featureTypeMatches('region'), { message: 'properties.type must be "region"' });

export const RouteFeatureSchema = z
  .object({
    type: z.literal('Feature'),
    geometry: LineStringGeometrySchema,
    properties: SpatialPropertiesSchema,
  })
  .refine(featureTypeMatches('route'), { message: 'properties.type must be "route"' });

export const LabelFeatureSchema = z
  .object({
    type: z.literal('Feature'),
    geometry: LabelGeometrySchema,
    properties: SpatialPropertiesSchema,
  })
  .refine(featureTypeMatches('label'), { message: 'properties.type must be "label"' })
  .refine((f) => f.properties.text !== undefined, {
    message: 'a label feature needs properties.text',
  });

/** Every concrete geometry shape a spatial feature can have, across all four entity kinds. */
const AnySpatialGeometrySchema = z.union([
  PointGeometrySchema,
  LineStringGeometrySchema,
  PolygonGeometrySchema,
  MultiPolygonGeometrySchema,
]);

export const SpatialFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      geometry: AnySpatialGeometrySchema,
      properties: SpatialPropertiesSchema,
    }),
  ),
});

export type SpatialFeature = z.infer<typeof SpatialFeatureCollectionSchema>['features'][number];
