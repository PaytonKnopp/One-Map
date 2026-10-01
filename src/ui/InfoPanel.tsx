import { useEffect, useRef, type CSSProperties } from 'react';

import { formatDate } from '../core/calendar.ts';
import { Markdown } from '../content/Markdown.tsx';
import {
  containingRegions,
  regionAreaInWorldUnits,
  routeLengthInWorldUnits,
} from '../content/computed.ts';
import { getEntity } from '../content/entities.ts';
import { loadMapData, world } from '../map/data.ts';

interface InfoPanelProps {
  entityId: string;
  onClose: () => void;
  onSelectEntity: (id: string) => void;
  onOpenMap: (mapId: string) => void;
}

function EntityLink({ id, onSelectEntity }: { id: string; onSelectEntity: (id: string) => void }) {
  const entity = getEntity(id);
  return (
    <button
      type="button"
      onClick={() => onSelectEntity(id)}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        color: entity ? '#2a5db0' : '#a33',
        textDecoration: entity ? 'underline' : 'underline dashed',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      {entity?.name ?? id}
    </button>
  );
}

/** The click/tap info panel (brief §8) — name, dates, tags, relations (both directions), computed facts, and the full lore body. */
export function InfoPanel({ entityId, onClose, onSelectEntity, onOpenMap }: InfoPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const entity = getEntity(entityId);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [entityId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!entity) {
    return (
      <aside style={panelStyle} aria-label="Entity not found">
        <button
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
          style={closeButtonStyle}
          aria-label="Close"
        >
          ×
        </button>
        <p>No entity found with id "{entityId}".</p>
      </aside>
    );
  }

  const regions = containingRegions(entity);
  const routeLength = routeLengthInWorldUnits(entity);
  const regionArea = regionAreaInWorldUnits(entity);
  const unit = entity.spatial ? loadMapData(entity.spatial.mapId).map.unit : undefined;

  return (
    <aside style={panelStyle} aria-label={`${entity.name} details`}>
      <button
        type="button"
        ref={closeButtonRef}
        onClick={onClose}
        style={closeButtonStyle}
        aria-label="Close"
      >
        ×
      </button>

      <h2 style={{ marginTop: 0, marginBottom: 4 }}>{entity.name}</h2>
      <p style={{ margin: '0 0 12px', opacity: 0.7, fontSize: 13 }}>
        {entity.type}
        {entity.subtype ? ` · ${entity.subtype}` : ''}
        {entity.status !== 'canon' ? ` · ${entity.status}` : ''}
      </p>

      {entity.summary && <p>{entity.summary}</p>}

      {(entity.from || entity.to || entity.date) && (
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          {entity.date && formatDate(entity.date, world.calendar)}
          {entity.from && entity.to
            ? `${formatDate(entity.from, world.calendar)} – ${formatDate(entity.to, world.calendar)}`
            : entity.from
              ? `From ${formatDate(entity.from, world.calendar)}`
              : entity.to
                ? `Until ${formatDate(entity.to, world.calendar)}`
                : ''}
        </p>
      )}

      {entity.tags.length > 0 && (
        <p style={{ fontSize: 13 }}>
          {entity.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                background: '#eee',
                borderRadius: 4,
                padding: '1px 6px',
                marginRight: 4,
              }}
            >
              {tag}
            </span>
          ))}
        </p>
      )}

      {regions.length > 0 && (
        <p style={{ fontSize: 13 }}>
          In:{' '}
          {regions.map((region, i) => (
            <span key={region.id}>
              {i > 0 && ', '}
              <EntityLink id={region.id} onSelectEntity={onSelectEntity} />
            </span>
          ))}
        </p>
      )}

      {routeLength !== undefined && unit && (
        <p style={{ fontSize: 13 }}>
          Length: {routeLength.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}
        </p>
      )}
      {regionArea !== undefined && unit && (
        <p style={{ fontSize: 13 }}>
          Area: {regionArea.toLocaleString(undefined, { maximumFractionDigits: 1 })} {unit}²
        </p>
      )}

      {entity.mapLink && (
        <p style={{ fontSize: 13 }}>
          <button
            type="button"
            onClick={() => onOpenMap(entity.mapLink!)}
            style={{
              background: 'none',
              border: '1px solid rgba(128,128,128,0.4)',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
            }}
          >
            Open map →
          </button>
        </p>
      )}

      {(entity.relations.length > 0 || entity.backlinks.length > 0) && (
        <section>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Relations</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {entity.relations.map((relation, i) => (
              <li key={`out-${i}`}>
                {relation.type} <EntityLink id={relation.target} onSelectEntity={onSelectEntity} />
              </li>
            ))}
            {entity.backlinks.map((backlink, i) => (
              <li key={`in-${i}`}>
                {backlink.type}{' '}
                <EntityLink id={backlink.sourceId} onSelectEntity={onSelectEntity} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {entity.images.length > 0 && (
        <section style={{ marginTop: 12 }}>
          {entity.images.map((image, i) => (
            <figure key={i} style={{ margin: '0 0 8px' }}>
              <img src={image.src} alt={image.alt} style={{ maxWidth: '100%', borderRadius: 4 }} />
              {image.caption && (
                <figcaption style={{ fontSize: 12, opacity: 0.7 }}>{image.caption}</figcaption>
              )}
            </figure>
          ))}
        </section>
      )}

      {entity.lore && (
        <section style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5 }}>
          <Markdown>{entity.lore.body}</Markdown>
        </section>
      )}
    </aside>
  );
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  width: 'min(360px, 100%)',
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
