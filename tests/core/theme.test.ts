import { describe, expect, it } from 'vitest';

import { resolveTypeStyle, type Theme } from '../../src/core/schema/theme.ts';

const theme: Theme = {
  schemaVersion: 1,
  id: 'test',
  name: 'Test',
  background: '#ffffff',
  fonts: { decorative: 'Cinzel', sans: 'Inter' },
  default: {
    fill: '#default-fill',
    stroke: '#default-stroke',
    label: { color: '#default-label', size: 10 },
  },
  byType: {
    region: {
      fill: '#region-fill',
      label: { size: 16 },
    },
  },
  bySubtype: {
    sea: {
      fill: '#sea-fill',
    },
  },
};

describe('resolveTypeStyle', () => {
  it('falls back to the theme default when neither byType nor bySubtype set a field', () => {
    const resolved = resolveTypeStyle(theme, 'place', 'city');
    expect(resolved.fill).toBe('#default-fill');
    expect(resolved.stroke).toBe('#default-stroke');
  });

  it('byType overrides the default', () => {
    const resolved = resolveTypeStyle(theme, 'region', 'country');
    expect(resolved.fill).toBe('#region-fill');
  });

  it('bySubtype overrides byType, which overrides the default', () => {
    const resolved = resolveTypeStyle(theme, 'region', 'sea');
    expect(resolved.fill).toBe('#sea-fill');
    // stroke isn't set by either override, so it still falls through to default.
    expect(resolved.stroke).toBe('#default-stroke');
  });

  it('merges the nested `label` object field-by-field rather than replacing it wholesale', () => {
    const resolved = resolveTypeStyle(theme, 'region', 'country');
    expect(resolved.label?.size).toBe(16); // from byType.region.label
    expect(resolved.label?.color).toBe('#default-label'); // from default.label, not overwritten
  });

  it('handles an entity with no subtype', () => {
    const resolved = resolveTypeStyle(theme, 'region', undefined);
    expect(resolved.fill).toBe('#region-fill');
  });
});
