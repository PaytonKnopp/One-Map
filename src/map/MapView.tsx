import type { FeatureCollection, Geometry } from 'geojson';
import {
  Map as MapLibreGLMap,
  NavigationControl,
  setWorkerUrl,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';

import { toSortKey } from '../core/calendar.ts';
import { ringCentroid } from '../core/geometry.ts';
import type { SpatialFeature } from '../core/schema/entity.ts';
import type { MapConfig } from '../core/schema/map.ts';
import type { Theme } from '../core/schema/theme.ts';
import { CoordinateReadout } from './CoordinateReadout.tsx';
import { world } from './data.ts';
import { ensureIconImage, iconImageId } from './icons.ts';
import { LabelOverlay } from './LabelOverlay.tsx';
import { MeasureTool } from './MeasureTool.tsx';
import { ScaleBar } from './ScaleBar.tsx';
import { resolveFeatureStyle } from './style.ts';
import { featureTimelineKeys } from './timeline.ts';

const GHOST_OPACITY_FACTOR = 0.25;

// MapLibre's own relative-URL worker lookup breaks once Vite bundles its
// entry into our single chunk, and a plain `?url` import of the worker
// file alone breaks too (the worker imports a sibling chunk by relative
// path — see vite.config.ts's copyMaplibreWorkerPlugin, which copies both
// files, under their original names, into this publicDir path).
setWorkerUrl(`${import.meta.env.BASE_URL}vendor/maplibre-gl/maplibre-gl-worker.mjs`);

interface MapViewProps {
  map: MapConfig;
  theme: Theme;
  featuresByLayer: Map<string, SpatialFeature[]>;
  /** The entity whose info panel is open (brief §8) — the map flies to it if it has geometry. */
  selectedEntityId?: string | undefined;
  onSelectEntity?: ((id: string) => void) | undefined;
  /** The timeline's current year (brief §4.3); defaults to the world's `currentYear`. */
  viewedYear?: number | undefined;
  /** Show out-of-range entities faded instead of hiding them. */
  ghost?: boolean | undefined;
  /** Measure tool (brief §8): click two points to see the planar distance between them. */
  measureActive?: boolean | undefined;
}

const SOURCE_PREFIX = 'layer:';

/** Builds the GeoJSON MapLibre will source a layer from, with every style value the paint expressions need precomputed per feature (see src/map/style.ts). */
function buildStyledCollection(
  features: SpatialFeature[],
  theme: Theme,
  mapMinZoom: number,
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map((feature) => {
      const style = resolveFeatureStyle(feature, theme, mapMinZoom);
      const timeline = featureTimelineKeys(feature, world.calendar);
      return {
        type: 'Feature',
        id: feature.properties.id,
        geometry: feature.geometry as Geometry,
        properties: {
          ...feature.properties,
          _fill: style.fill,
          _fillOpacity: style.fillOpacity,
          _stroke: style.stroke,
          _strokeWidth: style.strokeWidth,
          _lineDasharray: style.lineDasharray,
          _pointColor: style.pointColor,
          _pointRadius: style.pointRadius,
          _iconImage: iconImageId(style.iconId, style.pointColor),
          _minZoom: style.minZoom,
          _fromKey: timeline.from,
          _toKey: timeline.to,
        },
      };
    }),
  };
}

const ZOOM_FILTER = ['>=', ['zoom'], ['get', '_minZoom']];
const IS_CURRENT = (viewedYearKey: number) => [
  'all',
  ['<=', ['get', '_fromKey'], viewedYearKey],
  ['>=', ['get', '_toKey'], viewedYearKey],
];

/** Hide out-of-timeline-range features when not ghosting; zoom-only filter when ghosting (opacity carries the "not current now" signal instead — brief §4.3). */
function timelineFilter(viewedYearKey: number, ghost: boolean) {
  return ghost ? ZOOM_FILTER : ['all', ZOOM_FILTER, IS_CURRENT(viewedYearKey)];
}

/** `baseOpacityExpr` dimmed by GHOST_OPACITY_FACTOR for out-of-range features when ghosting; unchanged otherwise. */
function timelineOpacity(baseOpacityExpr: unknown, viewedYearKey: number, ghost: boolean): unknown {
  if (!ghost) return baseOpacityExpr;
  return [
    'case',
    IS_CURRENT(viewedYearKey),
    baseOpacityExpr,
    ['*', baseOpacityExpr, GHOST_OPACITY_FACTOR],
  ];
}

function addRegionLayers(
  map: MapLibreGLMap,
  sourceId: string,
  viewedYearKey: number,
  ghost: boolean,
): void {
  map.addLayer({
    id: `${sourceId}:fill`,
    type: 'fill',
    source: sourceId,
    filter: timelineFilter(viewedYearKey, ghost) as never,
    paint: {
      'fill-color': ['get', '_fill'],
      'fill-opacity': timelineOpacity(['get', '_fillOpacity'], viewedYearKey, ghost) as never,
    },
  });
  map.addLayer({
    id: `${sourceId}:line`,
    type: 'line',
    source: sourceId,
    filter: timelineFilter(viewedYearKey, ghost) as never,
    paint: {
      'line-color': ['get', '_stroke'],
      'line-width': ['get', '_strokeWidth'],
      'line-opacity': timelineOpacity(1, viewedYearKey, ghost) as never,
    },
  });
}

function addRouteLayer(
  map: MapLibreGLMap,
  sourceId: string,
  viewedYearKey: number,
  ghost: boolean,
): void {
  map.addLayer({
    id: `${sourceId}:line`,
    type: 'line',
    source: sourceId,
    filter: timelineFilter(viewedYearKey, ghost) as never,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', '_stroke'],
      'line-width': ['get', '_strokeWidth'],
      'line-opacity': timelineOpacity(1, viewedYearKey, ghost) as never,
      // MapLibre's line-dasharray can't be a data expression — per-feature
      // dash patterns would need splitting routes into per-dash-style
      // layers. Deferred until a real route actually needs it (YAGNI).
    },
  });
}

function addPlaceLayer(
  map: MapLibreGLMap,
  sourceId: string,
  viewedYearKey: number,
  ghost: boolean,
): void {
  map.addLayer({
    id: `${sourceId}:icon`,
    type: 'symbol',
    source: sourceId,
    filter: timelineFilter(viewedYearKey, ghost) as never,
    layout: {
      'icon-image': ['get', '_iconImage'],
      'icon-size': 0.5,
      'icon-allow-overlap': false,
      'icon-anchor': 'center',
    },
    paint: {
      'icon-opacity': timelineOpacity(1, viewedYearKey, ghost) as never,
    },
  });
}

/** Re-applies filter/opacity on every already-added layer when the timeline year or ghost toggle changes, without rebuilding sources. */
function updateTimelineStyling(
  map: MapLibreGLMap,
  mapConfig: MapConfig,
  viewedYearKey: number,
  ghost: boolean,
): void {
  for (const layer of mapConfig.layers) {
    const sourceId = `${SOURCE_PREFIX}${layer.id}`;
    for (const suffix of [':fill', ':line', ':icon'] as const) {
      const layerId = `${sourceId}${suffix}`;
      const glLayer = map.getLayer(layerId);
      if (!glLayer) continue;
      map.setFilter(layerId, timelineFilter(viewedYearKey, ghost) as never);
      if (glLayer.type === 'fill') {
        map.setPaintProperty(
          layerId,
          'fill-opacity',
          timelineOpacity(['get', '_fillOpacity'], viewedYearKey, ghost) as never,
        );
      } else if (glLayer.type === 'line') {
        map.setPaintProperty(
          layerId,
          'line-opacity',
          timelineOpacity(1, viewedYearKey, ghost) as never,
        );
      } else if (glLayer.type === 'symbol') {
        map.setPaintProperty(
          layerId,
          'icon-opacity',
          timelineOpacity(1, viewedYearKey, ghost) as never,
        );
      }
    }
  }
}

/**
 * The map viewer. Owns the MapLibre instance and the GeoJSON layers; the
 * text labels, scale bar, and coordinate readout are separate DOM/SVG
 * overlays kept in sync with it (see docs/DECISIONS.md).
 */
export function MapView({
  map: mapConfig,
  theme,
  featuresByLayer,
  selectedEntityId,
  onSelectEntity,
  viewedYear,
  ghost = false,
  measureActive = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreGLMap | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreGLMap | null>(null);
  const viewedYearKey = toSortKey({ y: viewedYear ?? world.calendar.currentYear }, world.calendar);

  // A ref, not a dependency, so picking a new onSelectEntity identity each
  // render doesn't force the whole map (sources, layers, icon loading) to
  // be rebuilt — only the click handler itself needs the latest callback.
  const onSelectEntityRef = useRef(onSelectEntity);
  useEffect(() => {
    onSelectEntityRef.current = onSelectEntity;
  }, [onSelectEntity]);

  // Likewise a ref for the timeline state used at layer-CREATION time only,
  // so the very first paint already matches without a flash — ongoing
  // changes go through the imperative update effect below instead of a
  // full source/layer rebuild (see that effect's comment). Declared before
  // the mount effect so it's already current when that effect first runs.
  const initialTimelineRef = useRef({ viewedYearKey, ghost });
  useEffect(() => {
    initialTimelineRef.current = { viewedYearKey, ghost };
  }, [viewedYearKey, ghost]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const map = new MapLibreGLMap({
      container,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': theme.background },
          },
        ],
        // No `glyphs` endpoint — this project renders text as a DOM/SVG
        // overlay instead of MapLibre symbol-layer text (docs/DECISIONS.md).
      },
      center: mapConfig.defaultView.center,
      zoom: mapConfig.defaultView.zoom,
      minZoom: mapConfig.minZoom ?? null,
      maxZoom: mapConfig.maxZoom ?? null,
      maxBounds: mapConfig.bounds,
      attributionControl: false,
      renderWorldCopies: false,
    });

    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    let cancelled = false;

    map.on('load', () => {
      void (async () => {
        for (const layer of mapConfig.layers) {
          const features = featuresByLayer.get(layer.id) ?? [];
          if (features.length === 0) continue;

          const sourceId = `${SOURCE_PREFIX}${layer.id}`;
          const collection = buildStyledCollection(features, theme, mapConfig.minZoom ?? 0);

          // Places need their icon images registered before the symbol
          // layer is added, or MapLibre logs missing-image warnings.
          const isPlaceLayer = features.some((f) => f.properties.type === 'place');
          if (isPlaceLayer) {
            const pairs = new Map<string, { iconId: string; color: string }>();
            for (const feature of features) {
              const style = resolveFeatureStyle(feature, theme, mapConfig.minZoom ?? 0);
              pairs.set(iconImageId(style.iconId, style.pointColor), {
                iconId: style.iconId,
                color: style.pointColor,
              });
            }
            await Promise.all(
              Array.from(pairs.values()).map(({ iconId, color }) =>
                ensureIconImage(map, iconId, color),
              ),
            );
          }

          if (cancelled) return;
          map.addSource(sourceId, { type: 'geojson', data: collection });

          const types = new Set(features.map((f) => f.properties.type));
          const { viewedYearKey: initialYearKey, ghost: initialGhost } = initialTimelineRef.current;
          if (types.has('region')) addRegionLayers(map, sourceId, initialYearKey, initialGhost);
          if (types.has('route')) addRouteLayer(map, sourceId, initialYearKey, initialGhost);
          if (types.has('place')) addPlaceLayer(map, sourceId, initialYearKey, initialGhost);
          // `label`-type features have no map-layer geometry rendering of
          // their own beyond the text the LabelOverlay already draws.

          map.on('click', `${sourceId}:icon`, (e: MapLayerMouseEvent) => {
            const feature = e.features?.[0];
            const id = feature?.properties?.id as string | undefined;
            if (id) onSelectEntityRef.current?.(id);
          });
          map.on(
            'mouseenter',
            `${sourceId}:icon`,
            () => (map.getCanvas().style.cursor = 'pointer'),
          );
          map.on('mouseleave', `${sourceId}:icon`, () => (map.getCanvas().style.cursor = ''));
        }

        // Raster art-layer hook (brief §9) — a no-op today since no map
        // declares any, but a real image would just render underneath
        // the vector layers above once one is added.
        for (const artLayer of mapConfig.artLayers ?? []) {
          const sourceId = `art:${artLayer.id}`;
          map.addSource(sourceId, {
            type: 'image',
            url: `${import.meta.env.BASE_URL}${artLayer.src}`,
            coordinates: artLayer.bounds,
          });
          map.addLayer(
            {
              id: sourceId,
              type: 'raster',
              source: sourceId,
              paint: { 'raster-opacity': artLayer.opacity },
              layout: { visibility: artLayer.defaultVisible ? 'visible' : 'none' },
            },
            map.getStyle().layers?.[1]?.id, // just above the background, under every vector layer
          );
        }

        if (!cancelled) setMapInstance(map);
      })();
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
    // Rebuilt from scratch on theme/map/data identity changes — M2 has no
    // live-editing path yet, so this trades incremental updates for simplicity.
  }, [mapConfig, theme, featuresByLayer]);

  // Timeline/ghost changes are frequent (slider dragging) and must stay
  // smooth, so these update the already-created layers in place rather
  // than going through the full rebuild effect above.
  useEffect(() => {
    if (!mapInstance) return;
    updateTimelineStyling(mapInstance, mapConfig, viewedYearKey, ghost);
  }, [mapInstance, mapConfig, viewedYearKey, ghost]);

  const allFeatures = Array.from(featuresByLayer.values()).flat();

  // Flies to the selected entity (brief §8's info panel) when it has
  // geometry on this map — not on first mount (no entity picked yet), and
  // not if the id refers to an entity on a different map (nested maps, M4).
  useEffect(() => {
    if (!mapInstance || !selectedEntityId) return;
    const feature = allFeatures.find((f) => f.properties.id === selectedEntityId);
    if (!feature) return;

    const geometry = feature.geometry;
    const target =
      geometry.type === 'Point'
        ? { lng: geometry.coordinates[0], lat: geometry.coordinates[1] }
        : geometry.type === 'LineString'
          ? { lng: geometry.coordinates[0]![0], lat: geometry.coordinates[0]![1] }
          : ringCentroid(
              geometry.type === 'Polygon' ? geometry.coordinates[0]! : geometry.coordinates[0]![0]!,
            );

    mapInstance.easeTo({
      center: [target.lng, target.lat],
      zoom: Math.max(mapInstance.getZoom(), 6),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `allFeatures` is a fresh array identity every render; only mapInstance/selectedEntityId should retrigger the fly-to
  }, [mapInstance, selectedEntityId]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <LabelOverlay
        map={mapInstance}
        features={allFeatures}
        theme={theme}
        mapMinZoom={mapConfig.minZoom ?? 0}
        viewedYear={viewedYear}
        ghost={ghost}
      />
      <ScaleBar
        map={mapInstance}
        unit={mapConfig.unit}
        planeMetersPerUnit={mapConfig.planeMetersPerUnit}
      />
      <CoordinateReadout
        map={mapInstance}
        unit={mapConfig.unit}
        planeMetersPerUnit={mapConfig.planeMetersPerUnit}
      />
      <MeasureTool
        map={mapInstance}
        active={measureActive}
        unit={mapConfig.unit}
        planeMetersPerUnit={mapConfig.planeMetersPerUnit}
      />
    </div>
  );
}
