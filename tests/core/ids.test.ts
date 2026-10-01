import { describe, expect, it } from 'vitest';

import { isValidId, toKebabCase } from '../../src/core/ids.ts';

describe('isValidId', () => {
  it('accepts lowercase kebab-case ids', () => {
    expect(isValidId('stormhaven')).toBe(true);
    expect(isValidId('silverrun-river')).toBe(true);
    expect(isValidId('a-b-c-123')).toBe(true);
  });

  it('rejects uppercase, spaces, underscores, and leading/trailing/double hyphens', () => {
    expect(isValidId('Stormhaven')).toBe(false);
    expect(isValidId('silver run')).toBe(false);
    expect(isValidId('silver_run')).toBe(false);
    expect(isValidId('-stormhaven')).toBe(false);
    expect(isValidId('stormhaven-')).toBe(false);
    expect(isValidId('storm--haven')).toBe(false);
    expect(isValidId('')).toBe(false);
  });
});

describe('toKebabCase', () => {
  it('produces a valid id from arbitrary display text', () => {
    const candidate = toKebabCase('  The Ashen Empire!! ');
    expect(candidate).toBe('the-ashen-empire');
    expect(isValidId(candidate)).toBe(true);
  });

  it('strips accents', () => {
    expect(toKebabCase('Café du Port')).toBe('cafe-du-port');
  });
});
