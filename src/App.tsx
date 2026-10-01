import { useEffect, useMemo } from 'react';

import { MapView } from './map/MapView.tsx';
import { loadMapData, world } from './map/data.ts';

export function App() {
  useEffect(() => {
    document.title = world.name;
  }, []);

  // Parsed once per load, not per render — the data only changes between
  // builds. Throwing here (rather than rendering broken UI) matches the
  // project's "fail loud on invalid data" stance; `npm run validate` is
  // meant to catch this long before it reaches the browser.
  const { map, theme, featuresByLayer } = useMemo(() => loadMapData(world.defaultMap), []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <MapView map={map} theme={theme} featuresByLayer={featuresByLayer} />
    </div>
  );
}
