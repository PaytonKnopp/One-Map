import { useMemo, useState, type CSSProperties } from 'react';

import { listEntities, type Entity } from '../content/entities.ts';
import { usePanelDismiss } from './usePanelDismiss.ts';

interface BrowseViewProps {
  onSelectEntity: (id: string) => void;
  onClose: () => void;
}

const SHOW_RETIRED_DEFAULT = false;
const SHOW_DRAFT_DEFAULT = true; // dev-visible; a production build / toggle hides these later (brief §6's `status` rules)

/** The Browse/Index view (brief §8): every entity, filterable by type/tag/status. */
export function BrowseView({ onSelectEntity, onClose }: BrowseViewProps) {
  const closeButtonRef = usePanelDismiss(onClose);
  const [typeFilter, setTypeFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showRetired, setShowRetired] = useState(SHOW_RETIRED_DEFAULT);
  const [showDraft, setShowDraft] = useState(SHOW_DRAFT_DEFAULT);

  const all = useMemo(() => listEntities().sort((a, b) => a.name.localeCompare(b.name)), []);
  const types = useMemo(() => Array.from(new Set(all.map((e) => e.type))).sort(), [all]);
  const tags = useMemo(() => Array.from(new Set(all.flatMap((e) => e.tags))).sort(), [all]);

  const filtered = all.filter((entity: Entity) => {
    if (typeFilter && entity.type !== typeFilter) return false;
    if (tagFilter && !entity.tags.includes(tagFilter)) return false;
    if (entity.status === 'retired' && !showRetired) return false;
    if (entity.status === 'draft' && !showDraft) return false;
    return true;
  });

  return (
    <aside style={panelStyle} aria-label="Browse all entities">
      <button
        type="button"
        ref={closeButtonRef}
        onClick={onClose}
        style={closeButtonStyle}
        aria-label="Close"
      >
        ×
      </button>
      <h2 style={{ marginTop: 0 }}>Browse</h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
        <label>
          Type{' '}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">all</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tag{' '}
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">all</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={showDraft}
            onChange={(e) => setShowDraft(e.target.checked)}
          />{' '}
          draft
        </label>
        <label>
          <input
            type="checkbox"
            checked={showRetired}
            onChange={(e) => setShowRetired(e.target.checked)}
          />{' '}
          retired
        </label>
      </div>

      <p style={{ fontSize: 12, opacity: 0.6 }}>
        {filtered.length} of {all.length}
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {filtered.map((entity) => (
          <li key={entity.id} style={{ borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
            <button
              type="button"
              onClick={() => onSelectEntity(entity.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: '8px 2px',
                cursor: 'pointer',
                color: 'inherit',
                font: 'inherit',
              }}
            >
              <strong>{entity.name}</strong>{' '}
              <span style={{ fontSize: 12, opacity: 0.6 }}>
                {entity.type}
                {entity.subtype ? ` · ${entity.subtype}` : ''}
                {entity.status !== 'canon' ? ` · ${entity.status}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
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
