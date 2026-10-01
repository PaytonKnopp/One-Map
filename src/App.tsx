import { useEffect, useMemo, type CSSProperties } from 'react';

import { MapView } from './map/MapView.tsx';
import { loadMapData, world } from './map/data.ts';
import { useHashRoute } from './routing/useHashRoute.ts';
import { BrowseView } from './ui/BrowseView.tsx';
import { InfoPanel } from './ui/InfoPanel.tsx';
import { SearchBox } from './ui/SearchBox.tsx';

export function App() {
  useEffect(() => {
    document.title = world.name;
  }, []);

  // Parsed once per load, not per render — the data only changes between
  // builds. Throwing here (rather than rendering broken UI) matches the
  // project's "fail loud on invalid data" stance; `npm run validate` is
  // meant to catch this long before it reaches the browser.
  const { map, theme, featuresByLayer } = useMemo(() => loadMapData(world.defaultMap), []);

  const [route, navigate] = useHashRoute();
  const selectedEntityId = route.params.get('e') ?? undefined;
  const isBrowseOpen = route.path === 'browse';

  const selectEntity = (id: string) => navigate('', { e: id });
  const closePanel = () => navigate('');
  const openBrowse = () => navigate('browse');

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <MapView
        map={map}
        theme={theme}
        featuresByLayer={featuresByLayer}
        selectedEntityId={selectedEntityId}
        onSelectEntity={selectEntity}
      />
      <SearchBox onSelectEntity={selectEntity} />
      <button type="button" onClick={openBrowse} style={browseButtonStyle}>
        Browse
      </button>
      {isBrowseOpen && <BrowseView onSelectEntity={selectEntity} onClose={closePanel} />}
      {!isBrowseOpen && selectedEntityId && (
        <InfoPanel entityId={selectedEntityId} onClose={closePanel} onSelectEntity={selectEntity} />
      )}
    </div>
  );
}

const browseButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 244,
  zIndex: 1,
  padding: '6px 12px',
  borderRadius: 4,
  border: '1px solid rgba(128,128,128,0.4)',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
  font: '14px system-ui, sans-serif',
  cursor: 'pointer',
};
