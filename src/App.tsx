import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { MapView } from './map/MapView.tsx';
import { loadMapData, world } from './map/data.ts';
import { useHashRoute } from './routing/useHashRoute.ts';
import { AboutPage } from './ui/AboutPage.tsx';
import { Breadcrumbs } from './ui/Breadcrumbs.tsx';
import { BrowseView } from './ui/BrowseView.tsx';
import { ChroniclePage } from './ui/ChroniclePage.tsx';
import { InfoPanel } from './ui/InfoPanel.tsx';
import { SearchBox } from './ui/SearchBox.tsx';
import { ThemeSwitcher } from './ui/ThemeSwitcher.tsx';
import { Timeline } from './ui/Timeline.tsx';

export function App() {
  useEffect(() => {
    document.title = world.name;
  }, []);

  const [route, navigate] = useHashRoute();
  const selectedEntityId = route.params.get('e') ?? undefined;
  const currentMapId = route.params.get('map') ?? world.defaultMap;
  const themeOverride = route.params.get('theme') ?? undefined;

  // Timeline/measure state isn't deep-linked (brief doesn't ask for it, and
  // it would make every slider tick a history entry) — local state instead.
  const [viewedYear, setViewedYear] = useState(world.calendar.currentYear);
  const [ghost, setGhost] = useState(false);
  const [measureActive, setMeasureActive] = useState(false);

  // Parsed once per (map, theme) pair, not per render — the data only
  // changes between builds. Throwing here (rather than rendering broken
  // UI) matches the project's "fail loud on invalid data" stance;
  // `npm run validate` is meant to catch this long before it reaches the
  // browser.
  const { map, theme, featuresByLayer } = useMemo(
    () => loadMapData(currentMapId, themeOverride),
    [currentMapId, themeOverride],
  );

  // `map`/`theme` are the current *viewing session's* state, not tied to
  // one particular path — every navigation (opening Browse, picking an
  // entity, …) should carry them forward unless it's deliberately changing
  // one of them, or switching views would silently reset the map/theme the
  // user picked.
  const preserved = {
    map: route.params.get('map') ?? undefined,
    theme: route.params.get('theme') ?? undefined,
  };

  const selectEntity = (id: string) => navigate('', { ...preserved, e: id });
  const closePanel = () => navigate('', preserved);
  const openBrowse = () => navigate('browse', preserved);
  const openChronicle = () => navigate('chronicle', preserved);
  const openAbout = () => navigate('about', preserved);
  const openMap = (mapId: string, entityId?: string) =>
    navigate('', {
      theme: preserved.theme,
      map: mapId === world.defaultMap ? undefined : mapId,
      e: entityId,
    });
  const changeTheme = (themeId: string) =>
    navigate(route.path, {
      ...preserved,
      e: route.params.get('e') ?? undefined,
      theme: themeId === world.defaultTheme ? undefined : themeId,
    });

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <MapView
        map={map}
        theme={theme}
        featuresByLayer={featuresByLayer}
        selectedEntityId={selectedEntityId}
        onSelectEntity={selectEntity}
        viewedYear={viewedYear}
        ghost={ghost}
        measureActive={measureActive}
      />

      <div style={toolbarStyle}>
        <SearchBox onSelectEntity={selectEntity} />
        <button type="button" onClick={openBrowse} style={toolbarButtonStyle}>
          Browse
        </button>
        <button
          type="button"
          onClick={() => setMeasureActive((v) => !v)}
          style={{ ...toolbarButtonStyle, fontWeight: measureActive ? 700 : 400 }}
          aria-pressed={measureActive}
        >
          Measure
        </button>
        <ThemeSwitcher current={theme.id} onChange={changeTheme} />
        <button type="button" onClick={openChronicle} style={toolbarButtonStyle}>
          Chronicle
        </button>
        <button type="button" onClick={openAbout} style={toolbarButtonStyle}>
          About
        </button>
      </div>

      <div style={breadcrumbRowStyle}>
        <Breadcrumbs map={map} onNavigateToMap={openMap} />
      </div>

      <Timeline
        year={viewedYear}
        onYearChange={setViewedYear}
        ghost={ghost}
        onGhostChange={setGhost}
      />

      {route.path === 'browse' && <BrowseView onSelectEntity={selectEntity} onClose={closePanel} />}
      {route.path === 'chronicle' && <ChroniclePage onClose={closePanel} />}
      {route.path === 'about' && <AboutPage onClose={closePanel} />}
      {route.path === '' && selectedEntityId && (
        <InfoPanel
          entityId={selectedEntityId}
          onClose={closePanel}
          onSelectEntity={selectEntity}
          onOpenMap={openMap}
        />
      )}
    </div>
  );
}

const toolbarStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  right: 12,
  zIndex: 1,
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const toolbarButtonStyle: CSSProperties = {
  padding: '6px 12px',
  borderRadius: 4,
  border: '1px solid rgba(128,128,128,0.4)',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
  font: '14px system-ui, sans-serif',
  cursor: 'pointer',
};

const breadcrumbRowStyle: CSSProperties = {
  position: 'absolute',
  top: 56,
  left: 12,
  zIndex: 1,
};
