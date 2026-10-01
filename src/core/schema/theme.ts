import { z } from 'zod';

import { ID_PATTERN } from '../ids.ts';

const id = z.string().regex(ID_PATTERN, 'ids must be kebab-case');
const registryKey = z.string().regex(ID_PATTERN, 'registry keys must be kebab-case');
export const ColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'expected a hex color');

/**
 * Text styling for the DOM/SVG label overlay (see docs/DECISIONS.md — the
 * "Labels" entry). `font` names one of the theme's two registered font
 * stacks, not a raw font-family string, so a theme can't accidentally
 * depend on something that isn't actually shipped.
 */
export const LabelStyleSchema = z.object({
  font: z.enum(['decorative', 'sans']).optional(),
  color: ColorSchema.optional(),
  haloColor: ColorSchema.optional(),
  haloWidth: z.number().min(0).optional(),
  /** Base font size in CSS px at rank 1; the viewer scales this down by rank. */
  size: z.number().positive().optional(),
  letterSpacing: z.number().optional(),
  uppercase: z.boolean().optional(),
});

/** Map-rendering style for one entity type or subtype. Every field optional — unset falls back to the theme's `default`. */
export const TypeStyleSchema = z.object({
  fill: ColorSchema.optional(),
  fillOpacity: z.number().min(0).max(1).optional(),
  stroke: ColorSchema.optional(),
  strokeWidth: z.number().positive().optional(),
  lineDasharray: z.array(z.number().positive()).optional(),
  pointColor: ColorSchema.optional(),
  pointRadius: z.number().positive().optional(),
  label: LabelStyleSchema.optional(),
});

export const ThemeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  id,
  name: z.string().min(1),
  /** Canvas/ocean background color. */
  background: ColorSchema,
  fonts: z.object({
    /** Font-family name for region/title text — see assets/fonts and docs/ASSETS.md. */
    decorative: z.string().min(1),
    /** Font-family name for general labels. */
    sans: z.string().min(1),
  }),
  /** Fallback style used when neither bySubtype nor byType sets a field. */
  default: TypeStyleSchema,
  byType: z.record(registryKey, TypeStyleSchema).optional(),
  bySubtype: z.record(registryKey, TypeStyleSchema).optional(),
});

export type ColorValue = z.infer<typeof ColorSchema>;
export type LabelStyle = z.infer<typeof LabelStyleSchema>;
export type TypeStyle = z.infer<typeof TypeStyleSchema>;
export type Theme = z.infer<typeof ThemeSchema>;

/**
 * Resolves the effective style for a feature: bySubtype overrides byType
 * overrides the theme default, merged shallowly (and one level deeper for
 * `label`). Per-feature `properties.style` (if present) wins over all of
 * these — applied by the caller, not here, since this function only knows
 * about the theme.
 */
export function resolveTypeStyle(
  theme: Theme,
  type: string,
  subtype: string | undefined,
): TypeStyle {
  const byType = theme.byType?.[type];
  const bySubtype = subtype ? theme.bySubtype?.[subtype] : undefined;
  return {
    ...theme.default,
    ...byType,
    ...bySubtype,
    label: {
      ...theme.default.label,
      ...byType?.label,
      ...bySubtype?.label,
    },
  };
}
