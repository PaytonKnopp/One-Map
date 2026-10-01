import { useEffect, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Re-renders the calling component whenever the map's camera changes. The
 * label overlay and scale bar are plain DOM/SVG kept in sync with MapLibre's
 * own canvas this way, rather than living inside it (see docs/DECISIONS.md).
 */
export function useMapCamera(map: MapLibreMap | null): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!map) return;
    const onChange = () => setTick((t) => t + 1);
    map.on('move', onChange);
    map.on('resize', onChange);
    return () => {
      map.off('move', onChange);
      map.off('resize', onChange);
    };
  }, [map]);

  return tick;
}
