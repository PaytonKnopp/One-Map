/**
 * Maps a spatial entity's `rank` (1 = most prominent, 5 = least — brief §6)
 * to the zoom level its label/icon starts appearing at, relative to a map's
 * own `minZoom`. Rank 1 is always visible from the map's minimum zoom; each
 * rank after that needs progressively more zoom. One shared table so the
 * viewer and any future tooling (e.g. the snapshot script choosing a zoom
 * to demonstrate a given rank) agree on what "rank 3" actually means.
 */
const ZOOM_OFFSET_BY_RANK: Readonly<Record<number, number>> = {
  1: 0,
  2: 2,
  3: 4,
  4: 6,
  5: 9,
};

/** The zoom level at which an entity of this `rank` starts being shown, for a map with the given `minZoom`. */
export function rankMinZoom(rank: number, mapMinZoom: number): number {
  const offset = ZOOM_OFFSET_BY_RANK[rank] ?? ZOOM_OFFSET_BY_RANK[5]!;
  return mapMinZoom + offset;
}

/** Whether an entity of this `rank` should be visible at the given zoom, for a map with the given `minZoom`. */
export function isRankVisible(rank: number, zoom: number, mapMinZoom: number): boolean {
  return zoom >= rankMinZoom(rank, mapMinZoom);
}
