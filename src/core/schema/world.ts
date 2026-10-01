import { z } from 'zod';

export const MonthSchema = z.object({
  name: z.string().min(1),
  days: z.number().int().positive(),
});

export const CalendarSchema = z.object({
  /** Era label used for years before the Epoch (year 0), e.g. "BE". */
  eraBefore: z.string().min(1),
  /** Era label used for years at or after the Epoch, e.g. "AE". */
  eraAfter: z.string().min(1),
  /** Always 0 — the Epoch is year 0 by definition. Kept explicit for clarity in data. */
  epochYear: z.literal(0),
  months: z.array(MonthSchema).min(1),
  weekdays: z.array(z.string().min(1)).min(1),
  /** The in-world "now" — entities with no `to` date are current as of this year. */
  currentYear: z.number().int(),
});

export const TravelSpeedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  unitsPerDay: z.number().positive(),
});

export const ScaleSchema = z.object({
  /** Display name for one world unit, e.g. "world-km". */
  unit: z.string().min(1),
  /** How many EPSG:3857 planar meters make up one world unit. */
  planeMetersPerUnit: z.number().positive(),
  travelSpeeds: z.array(TravelSpeedSchema).optional(),
});

export const WorldSchema = z.object({
  schemaVersion: z.number().int().positive(),
  /** The world's name. This is the ONE place it lives — never hard-code it elsewhere. */
  name: z.string().min(1),
  scale: ScaleSchema,
  calendar: CalendarSchema,
  /** Theme id used when no map/entity overrides it. */
  defaultTheme: z.string().min(1),
  /** Map id opened by default when the viewer loads. */
  defaultMap: z.string().min(1),
});

export type Month = z.infer<typeof MonthSchema>;
export type CalendarConfig = z.infer<typeof CalendarSchema>;
export type TravelSpeed = z.infer<typeof TravelSpeedSchema>;
export type Scale = z.infer<typeof ScaleSchema>;
export type World = z.infer<typeof WorldSchema>;
