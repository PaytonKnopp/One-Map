import { describe, expect, it } from 'vitest';

import { isRankVisible, rankMinZoom } from '../../src/core/rank.ts';

describe('rankMinZoom', () => {
  it('rank 1 is visible from the map minimum zoom', () => {
    expect(rankMinZoom(1, 0)).toBe(0);
    expect(rankMinZoom(1, 2)).toBe(2);
  });

  it('higher rank numbers need progressively more zoom', () => {
    const zooms = [1, 2, 3, 4, 5].map((rank) => rankMinZoom(rank, 0));
    for (let i = 1; i < zooms.length; i++) {
      expect(zooms[i]!).toBeGreaterThan(zooms[i - 1]!);
    }
  });

  it('falls back to the least-prominent threshold for an out-of-range rank', () => {
    expect(rankMinZoom(99, 0)).toBe(rankMinZoom(5, 0));
  });
});

describe('isRankVisible', () => {
  it('matches zoom against the rank threshold', () => {
    expect(isRankVisible(2, 2, 0)).toBe(true);
    expect(isRankVisible(2, 1.9, 0)).toBe(false);
  });
});
