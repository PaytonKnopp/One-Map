import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { canonicalizeJsonValue, formatJson } from '../../scripts/lib/canonical-json.ts';

describe('canonicalizeJsonValue', () => {
  it('sorts object keys alphabetically, recursively, without touching array order', () => {
    const input = { b: 1, a: [{ z: 1, y: 2 }], c: { b: 1, a: 2 } };
    expect(canonicalizeJsonValue(input)).toEqual({
      a: [{ y: 2, z: 1 }],
      b: 1,
      c: { a: 2, b: 1 },
    });
    expect(Object.keys(canonicalizeJsonValue(input) as object)).toEqual(['a', 'b', 'c']);
  });

  it('rounds numbers inside a "coordinates" subtree to 6 decimals, at any nesting depth', () => {
    const point = canonicalizeJsonValue({ coordinates: [1.1234567, 2.9999999] }) as {
      coordinates: number[];
    };
    expect(point.coordinates).toEqual([1.123457, 3]);

    const polygon = canonicalizeJsonValue({
      coordinates: [[[1.00000049, 2.00000051]]],
    }) as { coordinates: number[][][] };
    expect(polygon.coordinates).toEqual([[[1, 2.000001]]]);
  });

  it('never rounds numbers outside a "coordinates" key', () => {
    const value = canonicalizeJsonValue({ rank: 3.123456789 }) as { rank: number };
    expect(value.rank).toBe(3.123456789);
  });
});

describe('formatJson', () => {
  it('produces the canonical form of the unformatted fixture', () => {
    const raw = readFileSync('tests/fixtures/unformatted-sample.json', 'utf8');
    const formatted = formatJson(JSON.parse(raw));
    expect(formatted).toBe(
      [
        '{',
        '  "geometry": {',
        '    "coordinates": [',
        '      12.123457,',
        '      -45.987654',
        '    ],',
        '    "type": "Point"',
        '  },',
        '  "properties": {',
        '    "name": "Test",',
        '    "rank": 3.000001',
        '  },',
        '  "type": "Feature"',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('is idempotent', () => {
    const raw = readFileSync('tests/fixtures/unformatted-sample.json', 'utf8');
    const once = formatJson(JSON.parse(raw));
    const twice = formatJson(JSON.parse(once));
    expect(twice).toBe(once);
  });
});
