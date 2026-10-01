import type { FeatureCollection, Geometry } from 'geojson';
import {
  Map as MapLibreGLMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';

import type { SpatialFeature } from '../core/schema/entity.ts';
import type { MapConfig } from '../core/schema/map.ts';
import type { Theme } from '../core/schema/theme.ts';
import { CoordinateReadout } from './CoordinateReadout.tsx';
import { ensureIconImage, iconImageId } from './icons.ts';
import { LabelOverlay } from './LabelOverlay.tsx';
import { ScaleBar } from './ScaleBar.tsx';
import { resolveFeatureStyle } from './style.ts';

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
        },
      };
    }),
  };
}

function addRegionLayers(map: MapLibreGLMap, sourceId: string): void {
  map.addLayer({
    id: `${sourceId}:fill`,
    type: 'fill',
    source: sourceId,
    filter: ['>=', ['zoom'], ['get', '_minZoom']],
    paint: {
      'fill-color': ['get', '_fill'],
      'fill-opacity': ['get', '_fillOpacity'],
    },
  });
  map.addLayer({
    id: `${sourceId}:line`,
    type: 'line',
    source: sourceId,
    filter: ['>=', ['zoom'], ['get', '_minZoom']],
    paint: {
      'line-color': ['get', '_stroke'],
      'line-width': ['get', '_strokeWidth'],
    },
  });
}

function addRouteLayer(map: MapLibreGLMap, sourceId: string): void {
  map.addLayer({
    id: `${sourceId}:line`,
    type: 'line',
    source: sourceId,
    filter: ['>=', ['zoom'], ['get', '_minZoom']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', '_stroke'],
      'line-width': ['get', '_strokeWidth'],
      // MapLibre's line-dasharray can't be a data expression — per-feature
      // dash patterns would need splitting routes into per-dash-style
      // layers. Deferred until a real route actually needs it (YAGNI).
    },
  });
}

function addPlaceLayer(map: MapLibreGLMap, sourceId: string): void {
  map.addLayer({
    id: `${sourceId}:icon`,
    type: 'symbol',
    source: sourceId,
    filter: ['>=', ['zoom'], ['get', '_minZoom']],
    layout: {
      'icon-image': ['get', '_iconImage'],
      'icon-size': 0.5,
      'icon-allow-overlap': false,
      'icon-anchor': 'center',
    },
  });
}

/**
 * The map viewer. Owns the MapLibre instance and the GeoJSON layers; the
 * text labels, scale bar, and coordinate readout are separate DOM/SVG
 * overlays kept in sync with it (see docs/DECISIONS.md).
 */
export function MapView({ map: mapConfig, theme, featuresByLayer }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreGLMap | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreGLMap | null>(null);
  const popupRef = useRef<Popup | null>(null);

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
          if (types.has('region')) addRegionLayers(map, sourceId);
          if (types.has('route')) addRouteLayer(map, sourceId);
          if (types.has('place')) addPlaceLayer(map, sourceId);
          // `label`-type features have no map-layer geometry rendering of
          // their own beyond the text the LabelOverlay already draws.

          map.on('click', `${sourceId}:icon`, (e: MapLayerMouseEvent) => {
            const feature = e.features?.[0];
            if (!feature) return;
            const props = feature.properties as { name?: string; summary?: string };
            popupRef.current?.remove();
            popupRef.current = new Popup({ closeButton: true, offset: 12 })
              .setLngLat(e.lngLat)
              .setHTML(
                `<strong>${props.name ?? '(unnamed)'}</strong>${props.summary ? `<p>${props.summary}</p>` : ''}`,
              )
              .addTo(map);
          });
          map.on(
            'mouseenter',
            `${sourceId}:icon`,
            () => (map.getCanvas().style.cursor = 'pointer'),
          );
          map.on('mouseleave', `${sourceId}:icon`, () => (map.getCanvas().style.cursor = ''));
        }

        if (!cancelled) setMapInstance(map);
      })();
    });

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
    // Rebuilt from scratch on theme/map/data identity changes — M2 has no
    // live-editing path yet, so this trades incremental updates for simplicity.
  }, [mapConfig, theme, featuresByLayer]);

  const allFeatures = Array.from(featuresByLayer.values()).flat();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <LabelOverlay
        map={mapInstance}
        features={allFeatures}
        theme={theme}
        mapMinZoom={mapConfig.minZoom ?? 0}
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
    </div>
  );
}
