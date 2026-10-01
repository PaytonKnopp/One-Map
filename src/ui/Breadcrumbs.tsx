import type { CSSProperties } from 'react';

import { getEntity } from '../content/entities.ts';
import type { MapConfig } from '../core/schema/map.ts';
import { world } from '../map/data.ts';

interface BreadcrumbsProps {
  map: MapConfig;
  onNavigateToMap: (mapId: string, entityId?: string) => void;
}

/** World › <parent entity> › <nested map> (brief §4.4) — only rendered once a nested map has actually been visited. */
export function Breadcrumbs({ map, onNavigateToMap }: BreadcrumbsProps) {
  if (map.id === world.defaultMap) return null;

  const parent = map.parentEntity ? getEntity(map.parentEntity) : undefined;

  return (
    <nav aria-label="Breadcrumb" style={containerStyle}>
      <button type="button" onClick={() => onNavigateToMap(world.defaultMap)} style={crumbStyle}>
        {world.name}
      </button>
      {parent && (
        <>
          <span aria-hidden="true"> › </span>
          <button
            type="button"
            onClick={() => onNavigateToMap(world.defaultMap, parent.id)}
            style={crumbStyle}
          >
            {parent.name}
          </button>
        </>
      )}
      {/* Skip a trailing crumb that would just repeat the parent entity's name (e.g. a city's own map, named after the city). */}
      {map.name !== parent?.name && (
        <>
          <span aria-hidden="true"> › </span>
          <span>{map.name}</span>
        </>
      )}
    </nav>
  );
}

const containerStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.85)',
  padding: '6px 10px',
  borderRadius: 4,
  font: '13px system-ui, sans-serif',
  color: '#1a1a1a',
  alignSelf: 'flex-start',
};

const crumbStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: '#2a5db0',
  textDecoration: 'underline',
  cursor: 'pointer',
  font: 'inherit',
};
