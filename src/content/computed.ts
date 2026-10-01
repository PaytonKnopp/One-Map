import {
  lineLengthMeters,
  metersToWorldUnits,
  pointInPolygonRings,
  polygonAreaSquareMeters,
} from '../core/geometry.ts';
import type { PolygonGeometry, MultiPolygonGeometry } from '../core/schema/geojson.ts';
import { loadMapData } from '../map/data.ts';
import { entitiesById, type Entity } from './entities.ts';

/**
 * Spatial facts computed on demand, never stored (brief §6): which
 * region(s) a place/label sits inside, a route's length, a region's area.
 * All in the owning map's own world units (`planeMetersPerUnit`), not
 * hardcoded meters.
 */

function regionPolygons(
  geometry: PolygonGeometry | MultiPolygonGeometry,
): (readonly [number, number][])[][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

/** Every region entity whose polygon contains this entity's point. Point-geometry entities only (brief's "which region(s) a place lies in"). */
export function containingRegions(entity: Entity): Entity[] {
  if (!entity.spatial || entity.spatial.feature.geometry.type !== 'Point') return [];
  const [lng, lat] = entity.spatial.feature.geometry.coordinates;

  const results: Entity[] = [];
  for (const other of entitiesById.values()) {
    if (other.id === entity.id || !other.spatial) continue;
    const geometry = other.spatial.feature.geometry;
    if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') continue;
    if (pointInPolygonRings({ lng, lat }, regionPolygons(geometry))) results.push(other);
  }
  return results;
}

/** A route's length in its map's own world units, or undefined for a non-route/non-spatial entity. */
export function routeLengthInWorldUnits(entity: Entity): number | undefined {
  if (!entity.spatial || entity.spatial.feature.geometry.type !== 'LineString') return undefined;
  const { map } = loadMapData(entity.spatial.mapId);
  const meters = lineLengthMeters(entity.spatial.feature.geometry.coordinates);
  return metersToWorldUnits(meters, map.planeMetersPerUnit);
}

/** A region's area in its map's own world units squared, or undefined for a non-region/non-spatial entity. */
export function regionAreaInWorldUnits(entity: Entity): number | undefined {
  if (!entity.spatial) return undefined;
  const geometry = entity.spatial.feature.geometry;
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return undefined;
  const { map } = loadMapData(entity.spatial.mapId);
  const squareMeters = regionPolygons(geometry).reduce(
    (sum, rings) => sum + polygonAreaSquareMeters(rings),
    0,
  );
  const metersPerUnit = map.planeMetersPerUnit;
  return squareMeters / (metersPerUnit * metersPerUnit);
}
