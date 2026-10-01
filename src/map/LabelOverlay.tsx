import { useMemo, type CSSProperties } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

import { ringCentroid } from '../core/geometry.ts';
import type { SpatialFeature } from '../core/schema/entity.ts';
import type { Theme } from '../core/schema/theme.ts';
import { resolveLabelStyle, resolveFeatureStyle } from './style.ts';
import { useMapCamera } from './useMapCamera.ts';

interface LabelOverlayProps {
  map: MapLibreMap | null;
  features: SpatialFeature[];
  theme: Theme;
  mapMinZoom: number;
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boxesOverlap(a: Box, b: Box): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/** Rough text width in px — good enough for collision avoidance, not typeset precision. */
function estimateTextWidth(text: string, sizePx: number, letterSpacing: number): number {
  return text.length * sizePx * 0.58 + Math.max(0, text.length - 1) * letterSpacing;
}

function labelText(feature: SpatialFeature): string | undefined {
  return feature.properties.text ?? feature.properties.name;
}

/** Picks the outer ring to anchor a region's label on: the largest sub-polygon for a MultiPolygon. */
function outerRingOf(geometry: SpatialFeature['geometry']): [number, number][] | undefined {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0];
  }
  if (geometry.type === 'MultiPolygon') {
    let best: [number, number][] | undefined;
    let bestSpan = -1;
    for (const polygon of geometry.coordinates) {
      const ring = polygon[0];
      if (!ring) continue;
      const lngs = ring.map((c) => c[0]);
      const span = Math.max(...lngs) - Math.min(...lngs);
      if (span > bestSpan) {
        bestSpan = span;
        best = ring;
      }
    }
    return best;
  }
  return undefined;
}

const FONT_FAMILY_FALLBACK: Record<'decorative' | 'sans', string> = {
  decorative: 'Cinzel, Georgia, serif',
  sans: 'Inter, system-ui, sans-serif',
};

/**
 * Renders every visible entity's label as an SVG overlay kept in sync with
 * the MapLibre canvas (see docs/DECISIONS.md — labels are not MapLibre
 * symbol layers). Straight text for points and region centroids; curved
 * `<textPath>` text for routes and line-geometry free labels.
 */
export function LabelOverlay({ map, features, theme, mapMinZoom }: LabelOverlayProps) {
  useMapCamera(map); // re-render on every camera change

  const fonts = {
    decorative: theme.fonts.decorative
      ? `${theme.fonts.decorative}, ${FONT_FAMILY_FALLBACK.decorative}`
      : FONT_FAMILY_FALLBACK.decorative,
    sans: theme.fonts.sans
      ? `${theme.fonts.sans}, ${FONT_FAMILY_FALLBACK.sans}`
      : FONT_FAMILY_FALLBACK.sans,
  };

  const zoom = map?.getZoom() ?? 0;

  const entries = useMemo(() => {
    if (!map) return [];

    type Entry =
      | { kind: 'point'; feature: SpatialFeature; x: number; y: number }
      | { kind: 'path'; feature: SpatialFeature; d: string; length: number };

    const candidates: Entry[] = [];

    for (const feature of features) {
      const text = labelText(feature);
      if (!text) continue;
      const style = resolveFeatureStyle(feature, theme, mapMinZoom);
      if (zoom < style.minZoom) continue;

      const geometry = feature.geometry;
      if (geometry.type === 'Point') {
        const [lng, lat] = geometry.coordinates;
        const { x, y } = map.project([lng, lat]);
        candidates.push({ kind: 'point', feature, x, y });
      } else if (geometry.type === 'LineString') {
        const projected = geometry.coordinates.map((c) => map.project(c));
        const d = projected.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        let length = 0;
        for (let i = 1; i < projected.length; i++) {
          length += Math.hypot(
            projected[i]!.x - projected[i - 1]!.x,
            projected[i]!.y - projected[i - 1]!.y,
          );
        }
        candidates.push({ kind: 'path', feature, d, length });
      } else {
        const ring = outerRingOf(geometry);
        if (!ring) continue;
        const centroid = ringCentroid(ring);
        const { x, y } = map.project([centroid.lng, centroid.lat]);
        candidates.push({ kind: 'point', feature, x, y });
      }
    }

    // Highest priority (lowest rank number) first; greedily drop anything
    // that overlaps an already-placed label.
    candidates.sort((a, b) => (a.feature.properties.rank ?? 3) - (b.feature.properties.rank ?? 3));

    const placedBoxes: Box[] = [];
    const placed: Entry[] = [];

    for (const entry of candidates) {
      const text = labelText(entry.feature)!;
      const labelStyle = resolveLabelStyle(entry.feature, theme);
      const width = estimateTextWidth(text, labelStyle.size, labelStyle.letterSpacing);
      const height = labelStyle.size * 1.3;

      let box: Box;
      if (entry.kind === 'point') {
        box = {
          minX: entry.x - width / 2,
          maxX: entry.x + width / 2,
          minY: entry.y,
          maxY: entry.y + height,
        };
      } else {
        if (entry.length < width) continue; // too short to fit the curved text — drop it
        // Approximate box: a line's label collision is checked against its midpoint only, not its full path.
        box = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      }

      if (entry.kind === 'point' && placedBoxes.some((p) => boxesOverlap(p, box))) continue;
      if (entry.kind === 'point') placedBoxes.push(box);
      placed.push(entry);
    }

    return placed;
  }, [map, features, theme, mapMinZoom, zoom]);

  if (!map) return null;

  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {entries.map((entry) => {
        const text = labelText(entry.feature)!;
        const style = resolveLabelStyle(entry.feature, theme);
        const textStyle: CSSProperties = {
          fontFamily: fonts[style.font],
          fontSize: style.size,
          letterSpacing: style.uppercase || style.letterSpacing ? style.letterSpacing : undefined,
          fill: style.color,
          paintOrder: 'stroke',
          stroke: style.haloColor,
          strokeWidth: style.haloWidth * 2,
          strokeLinejoin: 'round',
          textTransform: style.uppercase ? 'uppercase' : undefined,
        };

        if (entry.kind === 'point') {
          return (
            <text
              key={entry.feature.properties.id}
              x={entry.x}
              y={entry.y + style.size}
              textAnchor="middle"
              style={textStyle}
            >
              {text}
            </text>
          );
        }

        const pathId = `label-path-${entry.feature.properties.id}`;
        return (
          <g key={entry.feature.properties.id}>
            <path id={pathId} d={entry.d} fill="none" stroke="none" />
            <text style={textStyle}>
              <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                {text}
              </textPath>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
