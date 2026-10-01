import { useId, useState, type CSSProperties } from 'react';

import { searchEntities } from '../content/search.ts';

interface SearchBoxProps {
  onSelectEntity: (id: string) => void;
}

/** Client-side search over names/aliases/tags/summaries/lore text (brief §8) — picking a result opens it (and flies to it, if spatial). */
export function SearchBox({ onSelectEntity }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const listId = useId();
  const results = searchEntities(query).slice(0, 8);

  return (
    <div style={containerStyle}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && query) {
            e.stopPropagation();
            setQuery('');
          }
        }}
        placeholder="Search the world…"
        aria-label="Search"
        aria-controls={listId}
        style={inputStyle}
      />
      {results.length > 0 && (
        <ul id={listId} style={listStyle}>
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectEntity(result.id);
                  setQuery('');
                }}
                style={resultButtonStyle}
              >
                {result.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const containerStyle: CSSProperties = {
  position: 'relative',
};

const inputStyle: CSSProperties = {
  width: 220,
  padding: '6px 10px',
  borderRadius: 4,
  border: '1px solid rgba(128,128,128,0.4)',
  font: '14px system-ui, sans-serif',
};

const listStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  listStyle: 'none',
  margin: '4px 0 0',
  padding: 4,
  background: 'var(--color-bg)',
  border: '1px solid rgba(128,128,128,0.3)',
  borderRadius: 4,
  maxHeight: 240,
  overflowY: 'auto',
};

const resultButtonStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  padding: '6px 8px',
  cursor: 'pointer',
  color: 'inherit',
  font: 'inherit',
  borderRadius: 3,
};
