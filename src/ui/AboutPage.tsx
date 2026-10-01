import type { CSSProperties } from 'react';
import commits from 'virtual:chronicle';

import { regionAreaInWorldUnits } from '../content/computed.ts';
import { listEntities } from '../content/entities.ts';
import { listMapIds, world } from '../map/data.ts';
import { usePanelDismiss } from './usePanelDismiss.ts';

interface AboutPageProps {
  onClose: () => void;
}

/** About/Stats page (brief §8): world name, entity counts, map count, total mapped area, last updated, attributions. */
export function AboutPage({ onClose }: AboutPageProps) {
  const closeButtonRef = usePanelDismiss(onClose);
  const entities = listEntities();
  const countsByType = new Map<string, number>();
  for (const entity of entities) {
    countsByType.set(entity.type, (countsByType.get(entity.type) ?? 0) + 1);
  }

  const totalRegionArea = entities
    .filter((e) => e.type === 'region' && e.spatial?.mapId === world.defaultMap)
    .reduce((sum, e) => sum + (regionAreaInWorldUnits(e) ?? 0), 0);

  return (
    <aside style={panelStyle} aria-label="About and statistics">
      <button
        type="button"
        ref={closeButtonRef}
        onClick={onClose}
        style={closeButtonStyle}
        aria-label="Close"
      >
        ×
      </button>
      <h2 style={{ marginTop: 0 }}>{world.name}</h2>
      <p style={{ fontSize: 13, opacity: 0.7 }}>
        A lifelong, ever-expanding world-building map. "{world.name}" is a placeholder name — see{' '}
        <code>data/world.json</code>.
      </p>

      <h3 style={{ fontSize: 14 }}>Stats</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        <li>{entities.length} entities total</li>
        {Array.from(countsByType.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => (
            <li key={type}>
              {count} {type}
              {count === 1 ? '' : 's'}
            </li>
          ))}
        <li>{listMapIds().length} map(s)</li>
        <li>
          {totalRegionArea.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
          {world.scale.unit}² mapped (regions on the world map)
        </li>
        {commits[0] && <li>Last updated: {commits[0].date}</li>}
      </ul>

      <h3 style={{ fontSize: 14 }}>Credits</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        <li>Icons: Lucide (ISC)</li>
        <li>Fonts: Cinzel &amp; Inter (SIL OFL 1.1) via Google Fonts</li>
        <li>Map rendering: MapLibre GL JS (BSD-3-Clause)</li>
      </ul>
      <p style={{ fontSize: 12, opacity: 0.6 }}>
        Full licensing details: docs/ASSETS.md in the repository.
      </p>
    </aside>
  );
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  // Above the toolbar/breadcrumbs (zIndex 1, App.tsx) -- on a narrow
  // viewport the toolbar wraps tall enough to otherwise sit on top of
  // this panel's own close button and heading.
  zIndex: 2,
  bottom: 0,
  width: 'min(380px, 100%)',
  overflowY: 'auto',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
  padding: '16px 20px',
  boxShadow: '-2px 0 12px rgba(0,0,0,0.15)',
  boxSizing: 'border-box',
};

const closeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  background: 'none',
  border: 'none',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
  color: 'inherit',
};
