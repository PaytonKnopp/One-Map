import { useEffect, useState, type CSSProperties } from 'react';
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';

import { metersToWorldUnits, planarDistanceMeters } from '../core/geometry.ts';
import { world } from './data.ts';
import { useMapCamera } from './useMapCamera.ts';

interface MeasureToolProps {
  map: MapLibreMap | null;
  active: boolean;
  unit: string;
  planeMetersPerUnit: number;
}

interface Point {
  lng: number;
  lat: number;
}

/**
 * Click two points to measure the planar distance between them (brief §8),
 * in world units, with a travel-time estimate if the world defines any
 * travel speeds. Resets whenever `active` turns off.
 */
export function MeasureTool({ map, active, unit, planeMetersPerUnit }: MeasureToolProps) {
  const [points, setPoints] = useState<Point[]>([]);
  useMapCamera(map);

  // Reset during render when `active` flips off, not in an effect — React's
  // recommended pattern for "adjust state when a prop changes" (avoids the
  // extra render-then-reset cascade a useEffect+setState would cause).
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (!active) setPoints([]);
  }

  useEffect(() => {
    if (!map || !active) return undefined;
    const onClick = (e: MapMouseEvent) => {
      setPoints((prev) => {
        const next = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        return prev.length >= 2 ? [next] : [...prev, next];
      });
    };
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map, active]);

  if (!map || !active || points.length === 0) return null;

  const screenPoints = points.map((p) => map.project([p.lng, p.lat]));
  const distanceMeters = points.length === 2 ? planarDistanceMeters(points[0]!, points[1]!) : 0;
  const distanceUnits = metersToWorldUnits(distanceMeters, planeMetersPerUnit);
  const fastestSpeed = world.scale.travelSpeeds?.reduce(
    (max, s) => (s.unitsPerDay > max ? s.unitsPerDay : max),
    0,
  );
  const days = fastestSpeed ? distanceUnits / fastestSpeed : undefined;

  const mid =
    screenPoints.length === 2
      ? {
          x: (screenPoints[0]!.x + screenPoints[1]!.x) / 2,
          y: (screenPoints[0]!.y + screenPoints[1]!.y) / 2,
        }
      : screenPoints[0]!;

  return (
    <>
      <svg aria-hidden="true" style={svgStyle}>
        {screenPoints.length === 2 && (
          <line
            x1={screenPoints[0]!.x}
            y1={screenPoints[0]!.y}
            x2={screenPoints[1]!.x}
            y2={screenPoints[1]!.y}
            stroke="#c0392b"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}
        {screenPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#c0392b" />
        ))}
      </svg>
      {points.length === 2 && (
        <div style={{ ...labelStyle, left: mid.x, top: mid.y }}>
          {distanceUnits.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}
          {days !== undefined &&
            ` (~${days.toLocaleString(undefined, { maximumFractionDigits: 1 })} days)`}
        </div>
      )}
    </>
  );
}

const svgStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  overflow: 'visible',
};

const labelStyle: CSSProperties = {
  position: 'absolute',
  transform: 'translate(-50%, -100%)',
  background: 'rgba(255,255,255,0.9)',
  padding: '2px 6px',
  borderRadius: 3,
  font: '12px system-ui, sans-serif',
  color: '#1a1a1a',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};
