import { z } from 'zod';

import { ID_PATTERN } from '../ids.ts';

const registryKey = z.string().regex(ID_PATTERN, 'registry keys must be kebab-case');

export const SpatialTypeDefSchema = z.object({
  subtypes: z.array(registryKey),
});

/**
 * Non-spatial type definitions are intentionally open (`.passthrough()`): a
 * type can grow extra fields later (e.g. required-frontmatter hints) without
 * a schema migration, since `npm run new-type` (M5) only ever adds keys.
 */
export const NonSpatialTypeDefSchema = z.object({}).passthrough();

export const EntityTypesRegistrySchema = z.object({
  schemaVersion: z.number().int().positive(),
  spatial: z.record(registryKey, SpatialTypeDefSchema),
  nonSpatial: z.record(registryKey, NonSpatialTypeDefSchema),
});

export const RelationTypeDefSchema = z.object({
  /** The relation-type key used on the other end, e.g. capital-of -> capital. */
  reciprocal: registryKey,
});

export const RelationTypesRegistrySchema = z.object({
  schemaVersion: z.number().int().positive(),
  relations: z.record(registryKey, RelationTypeDefSchema),
});

export type SpatialTypeDef = z.infer<typeof SpatialTypeDefSchema>;
export type NonSpatialTypeDef = z.infer<typeof NonSpatialTypeDefSchema>;
export type EntityTypesRegistry = z.infer<typeof EntityTypesRegistrySchema>;
export type RelationTypeDef = z.infer<typeof RelationTypeDefSchema>;
export type RelationTypesRegistry = z.infer<typeof RelationTypesRegistrySchema>;
