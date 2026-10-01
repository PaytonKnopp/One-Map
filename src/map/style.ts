import { rankMinZoom } from '../core/rank.ts';
import { resolveTypeStyle, type Theme } from '../core/schema/theme.ts';
import type { SpatialFeature } from '../core/schema/entity.ts';

/** Rank used for any feature that doesn't set one — keeps it visible at ordinary zoom levels. */
export const DEFAULT_RANK = 3;
export const FALLBACK_ICON_ID = 'marker';

export interface ResolvedFeatureStyle {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  lineDasharray: number[] | undefined;
  pointColor: string;
  pointRadius: number;
  iconId: string;
  minZoom: number;
  rank: number;
}

/** Computes the theme-resolved, per-feature rendering style once, so MapLibre expressions and the label overlay read plain precomputed values instead of re-resolving the theme every frame. */
export function resolveFeatureStyle(
  feature: SpatialFeature,
  theme: Theme,
  mapMinZoom: number,
): ResolvedFeatureStyle {
  const { type, subtype, rank: rawRank, icon } = feature.properties;
  const style = resolveTypeStyle(theme, type, subtype);
  const rank = rawRank ?? DEFAULT_RANK;

  return {
    fill: style.fill ?? theme.default.fill ?? '#cccccc',
    fillOpacity: style.fillOpacity ?? theme.default.fillOpacity ?? 1,
    stroke: style.stroke ?? theme.default.stroke ?? '#333333',
    strokeWidth: style.strokeWidth ?? theme.default.strokeWidth ?? 1,
    lineDasharray: style.lineDasharray ?? theme.default.lineDasharray,
    pointColor: style.pointColor ?? theme.default.pointColor ?? '#333333',
    pointRadius: style.pointRadius ?? theme.default.pointRadius ?? 5,
    iconId: icon ?? subtype ?? FALLBACK_ICON_ID,
    minZoom: rankMinZoom(rank, mapMinZoom),
    rank,
  };
}

/** Resolved label text styling for a feature, merging theme label style with the feature's resolved rank-driven size scale. */
export interface ResolvedLabelStyle {
  font: 'decorative' | 'sans';
  color: string;
  haloColor: string;
  haloWidth: number;
  size: number;
  letterSpacing: number;
  uppercase: boolean;
}

export function resolveLabelStyle(feature: SpatialFeature, theme: Theme): ResolvedLabelStyle {
  const { type, subtype } = feature.properties;
  const style = resolveTypeStyle(theme, type, subtype);
  const label = { ...theme.default.label, ...style.label };

  return {
    font: label?.font ?? 'sans',
    color: label?.color ?? '#1a1a1a',
    haloColor: label?.haloColor ?? '#ffffff',
    haloWidth: label?.haloWidth ?? 0,
    size: label?.size ?? 12,
    letterSpacing: label?.letterSpacing ?? 0,
    uppercase: label?.uppercase ?? false,
  };
}
