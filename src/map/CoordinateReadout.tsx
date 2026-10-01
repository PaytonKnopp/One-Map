import { useEffect, useState } from 'react';
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';

import { metersToWorldUnits, toMercator } from '../core/geometry.ts';

interface CoordinateReadoutProps {
  map: MapLibreMap | null;
  unit: string;
  planeMetersPerUnit: number;
}

/** Cursor position as world-km (east/north of the origin) alongside raw lng/lat (brief §4.1). */
export function CoordinateReadout({ map, unit, planeMetersPerUnit }: CoordinateReadoutProps) {
  const [lngLat, setLngLat] = useState<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (!map) return;
    const onMove = (e: MapMouseEvent) => setLngLat({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    const onLeave = () => setLngLat(null);
    map.on('mousemove', onMove);
    map.on('mouseout', onLeave);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onLeave);
    };
  }, [map]);

  if (!lngLat) return null;

  const mercator = toMercator(lngLat);
  const eastWorldUnits = metersToWorldUnits(mercator.x, planeMetersPerUnit);
  const northWorldUnits = metersToWorldUnits(mercator.y, planeMetersPerUnit);

  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        background: 'rgba(255,255,255,0.85)',
        padding: '4px 8px',
        borderRadius: 4,
        font: '12px ui-monospace, monospace',
        color: '#1a1a1a',
        pointerEvents: 'none',
        textAlign: 'right',
      }}
    >
      <div>
        {eastWorldUnits >= 0 ? '+' : ''}
        {eastWorldUnits.toFixed(1)}, {northWorldUnits >= 0 ? '+' : ''}
        {northWorldUnits.toFixed(1)} {unit}
      </div>
      <div style={{ opacity: 0.7 }}>
        {lngLat.lng.toFixed(4)}, {lngLat.lat.toFixed(4)}
      </div>
    </div>
  );
}
