import { useMemo } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

import { destinationPoint, metersToWorldUnits, worldUnitsToMeters } from '../core/geometry.ts';
import { useMapCamera } from './useMapCamera.ts';

interface ScaleBarProps {
  map: MapLibreMap | null;
  unit: string;
  planeMetersPerUnit: number;
}

const TARGET_BAR_PX = 120;
const NICE_STEPS = [1, 2, 5];

/** The largest "nice" (1/2/5 x a power of ten) value at or below `maxValue`. */
function niceValueAtMost(maxValue: number): number {
  if (maxValue <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  let best = magnitude;
  for (const step of NICE_STEPS) {
    const candidate = step * magnitude;
    if (candidate <= maxValue) best = candidate;
  }
  return best;
}

/**
 * A custom planar scale bar — world-km (or whatever `unit` is), not
 * MapLibre's built-in ScaleControl, which is geodesic and would be wrong
 * on this flat planar world (see src/core/geometry.ts and docs/DECISIONS.md).
 */
export function ScaleBar({ map, unit, planeMetersPerUnit }: ScaleBarProps) {
  const tick = useMapCamera(map);

  const scale = useMemo(() => {
    if (!map) return null;
    const center = map.getCenter();
    const probeMeters = 1000;
    const p1 = map.project(center);
    const probe = destinationPoint({ lng: center.lng, lat: center.lat }, probeMeters, 90);
    const p2 = map.project([probe.lng, probe.lat]);
    const pxPerProbe = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (!Number.isFinite(pxPerProbe) || pxPerProbe === 0) return null;

    const metersPerPixel = probeMeters / pxPerProbe;
    const targetMeters = TARGET_BAR_PX * metersPerPixel;
    const targetUnits = metersToWorldUnits(targetMeters, planeMetersPerUnit);
    const niceUnits = niceValueAtMost(targetUnits) || targetUnits;
    const niceMeters = worldUnitsToMeters(niceUnits, planeMetersPerUnit);
    const barPx = niceMeters / metersPerPixel;

    return { niceUnits, barPx };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` stands in for the map's camera state
  }, [map, planeMetersPerUnit, tick]);

  if (!scale) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        background: 'rgba(255,255,255,0.85)',
        padding: '4px 8px',
        borderRadius: 4,
        font: '12px system-ui, sans-serif',
        color: '#1a1a1a',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: scale.barPx,
          borderBottom: '2px solid #1a1a1a',
          borderLeft: '2px solid #1a1a1a',
          borderRight: '2px solid #1a1a1a',
          height: 6,
          marginBottom: 2,
        }}
      />
      {scale.niceUnits.toLocaleString()} {unit}
    </div>
  );
}
