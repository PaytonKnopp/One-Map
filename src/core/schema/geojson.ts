import { z } from 'zod';

/**
 * Minimal, strict GeoJSON geometry schemas (RFC 7946) for exactly the
 * geometry types this project uses. 2D only ([lng, lat]) — elevation is not
 * part of the data model.
 */

export const CoordinateSchema = z.tuple([z.number(), z.number()]);

export const PointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: CoordinateSchema,
});

export const LineStringGeometrySchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(CoordinateSchema).min(2),
});

/** A closed linear ring: at least 4 positions, first equal to last (checked separately — see scripts/validate.ts). */
export const LinearRingSchema = z.array(CoordinateSchema).min(4);

export const PolygonGeometrySchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(LinearRingSchema).min(1),
});

export const MultiPolygonGeometrySchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(LinearRingSchema).min(1)).min(1),
});

export const RegionGeometrySchema = z.union([PolygonGeometrySchema, MultiPolygonGeometrySchema]);
export const LabelGeometrySchema = z.union([PointGeometrySchema, LineStringGeometrySchema]);

export type Coordinate = z.infer<typeof CoordinateSchema>;
export type PointGeometry = z.infer<typeof PointGeometrySchema>;
export type LineStringGeometry = z.infer<typeof LineStringGeometrySchema>;
export type PolygonGeometry = z.infer<typeof PolygonGeometrySchema>;
export type MultiPolygonGeometry = z.infer<typeof MultiPolygonGeometrySchema>;
export type RegionGeometry = z.infer<typeof RegionGeometrySchema>;
export type LabelGeometry = z.infer<typeof LabelGeometrySchema>;
